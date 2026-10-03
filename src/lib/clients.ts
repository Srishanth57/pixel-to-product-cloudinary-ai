import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";

cloudinary.config({ secure: true });
export { cloudinary };

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
// One place to change the model. Override with GEMINI_MODEL in .env.local.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const CLOUD = process.env.NEXT_PUBLIC_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "diagj36ul";

// Ask Gemini for JSON and parse it safely
export async function geminiJSON(prompt: string) {
  const r = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  const text = r.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt cleaning markdown fences if present
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

// Transcribe audio/video directly using Gemini if Cloudinary transcript is unavailable
export async function transcribeWithGemini(publicId: string): Promise<Array<{ i: number; s: number; e: number; t: string }>> {
  // Use Cloudinary's on-the-fly mp3 audio derivation
  const audioUrl = cloudinary.url(publicId, {
    resource_type: "video",
    format: "mp3",
  });

  const res = await fetch(audioUrl);
  if (!res.ok) {
    // Fallback to original URL if mp3 derivation fails
    const origUrl = cloudinary.url(publicId, { resource_type: "video" });
    const origRes = await fetch(origUrl);
    if (!origRes.ok) throw new Error(`Failed to fetch media file from Cloudinary: ${res.statusText}`);
    const buf = await origRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return transcribeBuffer(base64, "audio/mp3");
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return transcribeBuffer(base64, "audio/mp3");
}

async function transcribeBuffer(base64: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `Transcribe this audio recording accurately.
Break the transcription into logical timestamped sentences or natural speech segments.
Return ONLY a JSON array formatted as:
[
  {"i": 0, "s": 0.0, "e": 3.5, "t": "First spoken segment text..."},
  {"i": 1, "s": 3.6, "e": 7.2, "t": "Second spoken segment text..."}
]
where:
- "i" is 0-indexed segment integer
- "s" is start time in seconds (float)
- "e" is end time in seconds (float)
- "t" is the transcribed text.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "[]";
  try {
    return JSON.parse(text);
  } catch (e) {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  }
}