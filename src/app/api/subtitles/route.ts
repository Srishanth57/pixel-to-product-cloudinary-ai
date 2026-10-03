import { NextResponse } from "next/server";
import { cloudinary, CLOUD, geminiJSON } from "@/lib/clients";

const ts = (s: number) => {
  const safeS = Math.max(0, isNaN(s) ? 0 : s);
  return new Date(safeS * 1000).toISOString().slice(11, 23); // hh:mm:ss.mmm
};

export async function POST(req: Request) {
  try {
    const { publicId, lang, segs } = await req.json(); // lang e.g. "Hindi", "Spanish"

    if (!publicId || !lang || !Array.isArray(segs) || segs.length === 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const texts = segs.map((s: any) => s.t || "");
    const translated: string[] = await geminiJSON(
      `Translate the following array of sentences into ${lang}. Maintain exactly the same array length and order.
Input array:
${JSON.stringify(texts)}

Return ONLY a JSON array of translated strings: ["...", "..."]`
    );

    const vtt =
      "WEBVTT\n\n" +
      segs
        .map((s: any, i: number) => {
          const transText = (translated && translated[i]) || s.t || "";
          return `${ts(s.s)} --> ${ts(s.e)}\n${transText}\n`;
        })
        .join("\n");

    const track = `echo_subs/${publicId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${lang.toLowerCase()}.vtt`;
    const res = await cloudinary.uploader.upload(
      `data:text/vtt;base64,${Buffer.from(vtt).toString("base64")}`,
      { resource_type: "raw", public_id: track, overwrite: true }
    );

    const cues = segs.map((s: any, i: number) => ({ s: s.s, e: s.e, t: (translated && translated[i]) || s.t || "" }));
    return NextResponse.json({
      cues,
      lang,
      url: res.secure_url || `https://res.cloudinary.com/${CLOUD}/raw/upload/${track}`,
    });
  } catch (error: any) {
    console.error("Subtitles API error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate subtitles" }, { status: 500 });
  }
}