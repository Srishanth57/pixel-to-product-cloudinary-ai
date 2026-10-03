import { NextResponse } from "next/server";
import {
  cloudinary,
  CLOUD,
  geminiJSON,
  transcribeWithGemini,
} from "@/lib/clients";
import { buildReelCues, buildReelUrl } from "@/lib/reel";

export const maxDuration = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getCloudinaryTranscript(id: string) {
  const url = `https://res.cloudinary.com/${CLOUD}/raw/upload/${id}.transcript`;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const json = await r.json();
        if (Array.isArray(json) && json.length > 0) return json;
      }
    } catch {
      // Continue to next attempt
    }
    await sleep(1500);
  }
  return null;
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
    }

    // Attempt explicit speech transcription in background
    try {
      await cloudinary.uploader.explicit(publicId, {
        resource_type: "video",
        type: "upload",
        raw_convert: "google_speech",
      });
    } catch (err) {
      console.warn("Cloudinary explicit speech notice:", err);
    }

    // 1. TRANSCRIBE -> Speech to text segments
    let segs: Array<{ i: number; s: number; e: number; t: string }> = [];
    const raw = await getCloudinaryTranscript(publicId);

    if (raw && Array.isArray(raw)) {
      segs = raw
        .filter((x: any) => x.words?.length)
        .map((x: any, i: number) => ({
          i,
          s: +x.words[0].start_time,
          e: +x.words.at(-1).end_time,
          t: x.transcript,
        }));
    }

    if (!segs || segs.length === 0) {
      console.log(`Transcribing ${publicId} with Gemini...`);
      segs = await transcribeWithGemini(publicId);
    }

    if (!segs || segs.length === 0) {
      segs = [{ i: 0, s: 0, e: 10, t: "Media speech & audio content" }];
    }

    const totalWords = segs.reduce(
      (acc, curr) => acc + (curr.t ? curr.t.split(/\s+/).length : 0),
      0,
    );
    const mediaDuration = Math.max(
      10,
      Math.ceil(segs[segs.length - 1]?.e || 30),
    );

    // 2. CHAPTERING (Gemini analyzes transcript segments)
    let chapters: Array<{
      title: string;
      summary: string;
      tags: string[];
      start: number;
      end: number;
    }> = [];
    try {
      chapters = await geminiJSON(
        `Analyze this video/audio transcript and divide it into 2 to 6 logical chapters.
Transcript segments:
${JSON.stringify(segs)}

Return a JSON array of objects with schema:
[
  {
    "title": "Clear Chapter Title",
    "summary": "1-2 sentence chapter summary highlighting core concepts",
    "tags": ["topic1", "topic2", "keyword"],
    "start": number (start second float),
    "end": number (end second float)
  }
]`,
      );
    } catch (err) {
      console.error("Chaptering JSON generation error:", err);
    }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      chapters = [
        {
          title: "Part 1: Introduction & Key Points",
          summary:
            "Opening discussion and foundational topics covered in this recording.",
          tags: ["overview", "introduction"],
          start: segs[0]?.s || 0,
          end: mediaDuration,
        },
      ];
    }

    // 3. CROP into searchable clips (each is a new asset w/ metadata) + THUMBNAILS
    const clips = [];
    for (const [n, c] of chapters.entries()) {
      const cleanId = publicId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const clipId = `echo_clips/${cleanId}_ch${n + 1}`;
      const start = Math.max(0, Math.floor(c.start || 0));
      const end = Math.min(
        mediaDuration,
        Math.max(start + 1, Math.ceil(c.end || start + 5)),
      );
      const clipDuration = Math.max(1, end - start);

      const trimmed = cloudinary.url(publicId, {
        resource_type: "video",
        transformation: [{ start_offset: start, end_offset: end }],
        format: "mp4",
      });

      try {
        await cloudinary.uploader.upload(trimmed, {
          resource_type: "video",
          public_id: clipId,
          overwrite: true,
          tags: ["echochapters", cleanId, ...(c.tags || [])],
          context: {
            topic: c.title || `Chapter ${n + 1}`,
            summary: c.summary || "",
            start: String(start),
            end: String(end),
            duration: String(clipDuration),
            source: publicId,
          },
        });

        clips.push({
          ...c,
          id: clipId,
          start,
          end,
          duration: clipDuration,
          url: cloudinary.url(clipId, {
            resource_type: "video",
            format: "mp4",
          }),
          thumb: cloudinary.url(clipId, {
            resource_type: "video",
            start_offset: "auto",
            format: "jpg",
          }),
        });
      } catch (uploadErr) {
        console.warn(`Trimmed clip upload notice for ${clipId}:`, uploadErr);
        clips.push({
          ...c,
          id: clipId,
          start,
          end,
          duration: clipDuration,
          url: trimmed,
          thumb: cloudinary.url(publicId, {
            resource_type: "video",
            start_offset: start,
            format: "jpg",
          }),
        });
      }
    }

    // 4. HIGHLIGHTS & PROMO REEL
    let picks: Array<{ start: number; end: number }> = [];
    try {
      picks = await geminiJSON(
        `From this transcript, select 2 to 4 punchy, high-impact moments (each 5-12 seconds long) for a short promotional highlight reel.
Transcript segments:
${JSON.stringify(segs)}

Return ONLY a JSON array: [{"start": number, "end": number}]`,
      );
    } catch {
      picks = [{ start: 0, end: Math.min(10, mediaDuration) }];
    }

    if (!Array.isArray(picks) || picks.length === 0) {
      picks = [{ start: 0, end: Math.min(10, mediaDuration) }];
    }

    // Burn English subtitles into the reel (times are relative to the spliced reel)
    const reelCues = await buildReelCues(picks, segs);
    const reel = buildReelUrl(publicId, picks, reelCues);

    const thumb = cloudinary.url(publicId, {
      resource_type: "video",
      start_offset: "auto",
      format: "jpg",
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      publicId,
      mediaUrl: cloudinary.url(publicId, {
        resource_type: "video",
        format: "mp4",
      }),
      duration: mediaDuration,
      clips,
      reel,
      reelCues,
      picks,
      thumb,
      segs,
      stats: {
        totalSegments: segs.length,
        totalWords,
        chaptersCount: clips.length,
        highlightsCount: picks.length,
        elapsedSeconds,
      },
    });
  } catch (err: any) {
    console.error("Process API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process video/audio" },
      { status: 500 },
    );
  }
}
