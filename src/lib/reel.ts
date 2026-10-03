import { cloudinary, geminiJSON } from "./clients";
import type { Seg, Pick, Cue } from "./types";

// Cloudinary text layers break on these characters, so strip them and cap length.
const clean = (t: string) => t.replace(/[,\/%#?\\&\[\]{}|"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);

/** Map transcript segments onto the spliced reel timeline and translate them to English. */
export async function buildReelCues(picks: Pick[], segs: Seg[]): Promise<Cue[]> {
  const raw: Cue[] = [];
  let offset = 0;
  for (const p of picks) {
    for (const g of segs) {
      const s = Math.max(g.s, p.start), e = Math.min(g.e, p.end);
      if (e - s > 0.3) raw.push({ s: offset + s - p.start, e: offset + e - p.start, t: g.t });
    }
    offset += p.end - p.start;
  }
  const cues = raw.slice(0, 12);
  if (!cues.length) return [];
  let en: string[] = [];
  try {
    en = await geminiJSON(`Translate these sentences into English (keep them unchanged if already English). Keep the same array length and order.
${JSON.stringify(cues.map((c) => c.t))}
Return ONLY a JSON array of strings.`);
  } catch { /* fall back to the original text */ }
  return cues.map((c, i) => ({ s: +c.s.toFixed(2), e: +c.e.toFixed(2), t: clean(en[i] || c.t) })).filter((c) => c.t);
}

/** Splice the picks into one reel, then burn each cue in as a timed text layer at the bottom. */
export function buildReelUrl(publicId: string, picks: Pick[], cues: Cue[]) {
  const [first, ...rest] = picks;
  const splices = rest.map((p) => ({
    overlay: `video:${publicId.replace(/\//g, ":")}`,
    flags: "splice",
    transformation: [{ start_offset: p.start, end_offset: p.end }],
  }));
  const burned = cues.flatMap((c) => [
    { overlay: { font_family: "Arial", font_size: 34, font_weight: "bold", text: c.t }, color: "white", background: "rgb:000000b3", width: 800, crop: "fit" },
    { flags: "layer_apply", gravity: "south", y: 48, start_offset: c.s, end_offset: c.e },
  ]);
  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "mp4",
    transformation: [{ start_offset: first.start, end_offset: first.end }, ...splices, ...burned],
  });
}