"use client";
import { useState } from "react";
import { makeSubtitles } from "@/lib/api";
import type { Cue, Seg } from "@/lib/types";

const LANGS = ["Hindi", "Spanish", "French", "German", "Tamil", "Japanese"];
export type Track = { lang: string; url: string; cues: Cue[] };

export default function SubtitlePanel({ publicId, segs, onTrack }: { publicId: string; segs: Seg[]; onTrack: (t: Track) => void }) {
  const [lang, setLang] = useState(LANGS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true); setError("");
    try { onTrack(await makeSubtitles(publicId, lang, segs)); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  }
  return (
    <div>
      <label htmlFor="lang" className="mb-2 block text-sm text-muted">Subtitle language</label>
      <div className="flex gap-3">
        <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="flex-1 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button onClick={go} disabled={busy} className="btn btn-primary disabled:opacity-60">{busy ? "Translating" : "Generate"}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}