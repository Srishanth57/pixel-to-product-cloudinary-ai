import { NextResponse } from "next/server";
import { cloudinary, geminiJSON } from "@/lib/clients";
import { HttpError, assertPublicId, fail, readJson } from "@/lib/http";
import { cleanId } from "@/lib/ids";
import { isLang } from "@/lib/languages";
import { cleanSegs, vttTime } from "@/lib/segments";

export const maxDuration = 120;

const MAX_SEGS = 1500;
const CHUNK = 100;
const PARALLEL = 4;

async function translateChunk(texts: string[], lang: string): Promise<string[]> {
  const out = await geminiJSON(
    `Translate the following array of sentences into ${lang}. Maintain exactly the same array length and order.
Input array:
${JSON.stringify(texts)}

Return ONLY a JSON array of translated strings: ["...", "..."]`,
  );
  if (!Array.isArray(out) || out.length !== texts.length || out.some((t) => typeof t !== "string")) {
    throw new HttpError(502, "Translation came back malformed. Please try again.");
  }
  return out as string[];
}

async function translateAll(texts: string[], lang: string): Promise<string[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += CHUNK) chunks.push(texts.slice(i, i + CHUNK));
  const done: string[][] = [];
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    done.push(...(await Promise.all(chunks.slice(i, i + PARALLEL).map((c) => translateChunk(c, lang)))));
  }
  return done.flat();
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const publicId = assertPublicId(body.publicId);
    if (!isLang(body.lang)) throw new HttpError(400, "Unsupported language");
    const lang = body.lang;

    const segs = cleanSegs(body.segs).slice(0, MAX_SEGS);
    if (!segs.length) throw new HttpError(400, "No transcript segments provided");

    const translated = await translateAll(segs.map((s) => s.t), lang);
    const cues = segs.map((s, i) => ({ s: s.s, e: s.e, t: translated[i].trim() || s.t }));

    // Cue text may not contain a newline gap or the cue-timing arrow in WebVTT.
    const safe = (t: string) => t.replace(/-->/g, "->").replace(/\s*\n+\s*/g, " ");
    const vtt = "WEBVTT\n\n" + cues.map((c) => `${vttTime(c.s)} --> ${vttTime(c.e)}\n${safe(c.t)}\n`).join("\n");

    const res = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vtt).toString("base64")}`, {
      resource_type: "raw",
      public_id: `echo_subs/${cleanId(publicId)}_${lang.toLowerCase()}.vtt`,
      overwrite: true,
    });

    return NextResponse.json({ cues, lang, url: res.secure_url });
  } catch (err) {
    return fail(err, "Failed to generate subtitles");
  }
}
