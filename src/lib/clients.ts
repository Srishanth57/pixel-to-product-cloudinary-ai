import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";
import { HttpError } from "./http";
import { cleanSegs } from "./segments";
import type { Seg } from "./types";

cloudinary.config({ secure: true });
export { cloudinary };

// One place to change the model. Override with GEMINI_MODEL in .env.local.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/** Cloud name comes from CLOUDINARY_URL. Fails with a clear message instead of a bad URL. */
export function cloudName(): string {
  const name = cloudinary.config().cloud_name || process.env.NEXT_PUBLIC_CLOUD_NAME;
  if (!name) throw new HttpError(500, "Cloudinary is not configured. Set CLOUDINARY_URL in .env.local.");
  return name;
}

let client: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new HttpError(500, "Gemini is not configured. Set GEMINI_API_KEY in .env.local.");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = new Set([429, 500, 503]);

async function generate(args: Parameters<GoogleGenAI["models"]["generateContent"]>[0]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini().models.generateContent(args);
    } catch (err) {
      const e = err as { status?: number; code?: number };
      if (attempt < 2 && RETRYABLE.has(Number(e.status ?? e.code))) await sleep(1000 * 2 ** attempt);
      else throw err;
    }
  }
}

function parseJSON(text: string | undefined): unknown {
  if (!text) throw new HttpError(502, "The AI model returned an empty response.");
  try {
    return JSON.parse(text.replace(/```json\s*|```/g, "").trim());
  } catch {
    throw new HttpError(502, "The AI model returned malformed JSON. Please try again.");
  }
}

/** Ask Gemini for JSON. The caller validates the shape. */
export async function geminiJSON(prompt: string): Promise<unknown> {
  const r = await generate({ model: GEMINI_MODEL, contents: prompt, config: { responseMimeType: "application/json" } });
  return parseJSON(r.text);
}

// Inline audio plus prompt must stay under Gemini's ~20 MB request limit.
const MAX_AUDIO_BYTES = 14 * 1024 * 1024;

/** Fallback transcription for when Cloudinary speech-to-text is unavailable. */
export async function transcribeWithGemini(publicId: string): Promise<Seg[]> {
  const audioUrl = cloudinary.url(publicId, { resource_type: "video", format: "mp3" });
  const res = await fetch(audioUrl);
  if (!res.ok) throw new HttpError(502, `Could not fetch audio from Cloudinary (${res.status}).`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_AUDIO_BYTES) {
    throw new HttpError(413, "This file is too long for fallback transcription. Enable Cloudinary speech-to-text or upload a shorter file.");
  }

  const r = await generate({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "audio/mp3", data: Buffer.from(buf).toString("base64") } },
          {
            text: `Transcribe this audio accurately, split into natural timestamped speech segments.
Return ONLY a JSON array: [{"i": 0, "s": 0.0, "e": 3.5, "t": "spoken text"}]
"s" and "e" are start and end seconds as floats. "t" is the text.`,
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });
  return cleanSegs(parseJSON(r.text));
}
