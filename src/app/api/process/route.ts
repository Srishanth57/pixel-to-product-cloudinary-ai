import { NextResponse } from "next/server";
import { cloudinary, cloudName, geminiJSON, transcribeWithGemini } from "@/lib/clients";
import { HttpError, assertPublicId, fail, num, readJson } from "@/lib/http";
import { cleanId } from "@/lib/ids";
import { asDownload, buildReel, planMoments } from "@/lib/reel";
import { cleanSegs } from "@/lib/segments";
import type { Clip, Moment, Seg } from "@/lib/types";

export const maxDuration = 300;

const MAX_CHAPTERS = 6;
const MAX_MOMENTS = 5;
const MAX_MOMENT_SECONDS = 10;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Chapter = { title: string; summary: string; tags: string[]; start: number; end: number };

/** Cloudinary's speech-to-text writes a `.transcript` file a few seconds after the request. */
async function getCloudinaryTranscript(publicId: string): Promise<Seg[]> {
  const url = `https://res.cloudinary.com/${cloudName()}/raw/upload/${publicId}.transcript`;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const json = await r.json();
        if (Array.isArray(json)) {
          const segs = cleanSegs(
            json
              .filter((x) => x?.words?.length)
              .map((x) => ({ s: x.words[0].start_time, e: x.words.at(-1).end_time, t: x.transcript })),
          );
          if (segs.length) return segs;
        }
      }
    } catch {
      /* try again */
    }
    await sleep(1500);
  }
  return [];
}

async function getTranscript(publicId: string): Promise<Seg[]> {
  let requested = false;
  try {
    await cloudinary.uploader.explicit(publicId, { resource_type: "video", type: "upload", raw_convert: "google_speech" });
    requested = true;
  } catch (err) {
    console.warn("Cloudinary speech-to-text unavailable, using Gemini:", err);
  }
  const fromCloudinary = requested ? await getCloudinaryTranscript(publicId) : [];
  return fromCloudinary.length ? fromCloudinary : transcribeWithGemini(publicId);
}

async function getDuration(publicId: string, segs: Seg[]): Promise<number> {
  try {
    const r = await cloudinary.api.resource(publicId, { resource_type: "video" });
    if (Number(r.duration) > 0) return Math.ceil(r.duration);
  } catch {
    /* fall back to the transcript length */
  }
  return Math.max(10, Math.ceil(segs[segs.length - 1].e));
}

const cleanTag = (t: unknown) => (typeof t === "string" ? t.replace(/[,"]/g, "").trim().toLowerCase().slice(0, 40) : "");

/** Model output is untrusted: clamp, order and cap chapters, and drop anything malformed. */
function normalizeChapters(raw: unknown, duration: number): Chapter[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((c): Chapter => {
      const start = Math.min(Math.max(0, Math.floor(num(c?.start))), duration - 1);
      const end = Math.min(duration, Math.max(start + 1, Math.ceil(num(c?.end, start + 5))));
      return {
        title: typeof c?.title === "string" ? c.title.trim().slice(0, 120) : "",
        summary: typeof c?.summary === "string" ? c.summary.trim().slice(0, 400) : "",
        tags: Array.isArray(c?.tags) ? [...new Set<string>(c.tags.map(cleanTag).filter(Boolean))].slice(0, 8) : [],
        start,
        end,
      };
    })
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start)
    .slice(0, MAX_CHAPTERS);
}

async function makeClip(publicId: string, c: Chapter, n: number): Promise<Clip> {
  const source = cleanId(publicId);
  const id = `echo_clips/${source}_ch${n + 1}`;
  const title = c.title || `Chapter ${n + 1}`;
  const duration = c.end - c.start;
  const trimmed = cloudinary.url(publicId, {
    resource_type: "video",
    transformation: [{ start_offset: c.start, end_offset: c.end }],
    format: "mp4",
  });
  const base = { title, summary: c.summary, tags: c.tags, start: c.start, end: c.end, duration, id };

  try {
    await cloudinary.uploader.upload(trimmed, {
      resource_type: "video",
      public_id: id,
      overwrite: true,
      tags: ["echochapters", source, ...c.tags],
      context: { topic: title, summary: c.summary, start: String(c.start), end: String(c.end), duration: String(duration), source: publicId },
    });
    return {
      ...base,
      url: cloudinary.url(id, { resource_type: "video", format: "mp4" }),
      thumb: cloudinary.url(id, { resource_type: "video", start_offset: "auto", format: "jpg" }),
    };
  } catch (err) {
    // The chapter still plays from the trimmed URL, it just won't appear in library search.
    console.warn(`Clip upload failed for ${id}:`, err);
    return {
      ...base,
      url: trimmed,
      thumb: cloudinary.url(publicId, { resource_type: "video", start_offset: c.start, format: "jpg" }),
    };
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const publicId = assertPublicId((await readJson(req)).publicId);

    // 1. Transcribe
    const segs = await getTranscript(publicId);
    if (!segs.length) throw new HttpError(422, "No speech was detected in this file.");
    const duration = await getDuration(publicId, segs);
    const totalWords = segs.reduce((n, s) => n + s.t.split(/\s+/).length, 0);

    // 2. Chapters and highlight moments. Ask in parallel, they only depend on the transcript.
    const [chapterRaw, momentRaw] = await Promise.all([
      geminiJSON(`Analyze this transcript and divide it into 2 to ${MAX_CHAPTERS} logical chapters.
Transcript segments:
${JSON.stringify(segs)}

Return a JSON array of objects: [{"title": "Clear chapter title", "summary": "1-2 sentence summary of the core concepts", "tags": ["topic1", "topic2"], "start": seconds as number, "end": seconds as number}]`).catch((err) => {
        console.error("Chaptering failed:", err);
        return [];
      }),
      geminiJSON(`From this transcript, select 3 to ${MAX_MOMENTS} punchy, high-impact moments (each 6-${MAX_MOMENT_SECONDS} seconds long, about 25 seconds in total) for a promotional highlight reel.
Transcript segments:
${JSON.stringify(segs)}

Return ONLY a JSON array: [{"start": number, "end": number}]`).catch((err) => {
        console.error("Highlight selection failed:", err);
        return [];
      }),
    ]);

    let chapters = normalizeChapters(chapterRaw, duration);
    if (!chapters.length) {
      chapters = [{ title: "Full recording", summary: "", tags: [], start: 0, end: duration }];
    }
    const moments = planMoments(momentRaw, duration);

    // 3. Clips (uploaded in parallel) and the highlight reel
    const [clips, reel] = await Promise.all([
      Promise.all(chapters.map((c, n) => makeClip(publicId, c, n))),
      buildReel(publicId, moments, duration),
    ]);

    return NextResponse.json({
      publicId,
      mediaUrl: cloudinary.url(publicId, { resource_type: "video", format: "mp4" }),
      clips,
      reel,
      reelDownload: asDownload(reel, "echochapters-highlights"),
      thumb: cloudinary.url(publicId, { resource_type: "video", start_offset: "auto", format: "jpg" }),
      segs,
      stats: {
        totalSegments: segs.length,
        totalWords,
        chaptersCount: clips.length,
        highlightsCount: moments.length,
        elapsedSeconds: ((Date.now() - startedAt) / 1000).toFixed(1),
      },
    });
  } catch (err) {
    return fail(err, "Failed to process video");
  }
}
