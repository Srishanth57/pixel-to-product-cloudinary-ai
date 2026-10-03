import type { Seg } from "./types";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** hh:mm:ss.mmm, correct past 24 hours. */
export function vttTime(seconds: number) {
  const ms = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000);
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor((ms % 3_600_000) / 60_000))}:${pad(Math.floor((ms % 60_000) / 1000))}.${pad(ms % 1000, 3)}`;
}

/** Coerce untrusted segment data (model output or request body) into valid, ordered segments. */
export function cleanSegs(raw: unknown): Seg[] {
  if (!Array.isArray(raw)) return [];
  const out: Seg[] = [];
  for (const x of raw) {
    const s = Number((x as Seg)?.s);
    const e = Number((x as Seg)?.e);
    const t = typeof (x as Seg)?.t === "string" ? (x as Seg).t.trim() : "";
    if (t && Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s) out.push({ i: out.length, s, e, t });
  }
  return out;
}
