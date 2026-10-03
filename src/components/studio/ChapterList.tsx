import type { Clip } from "@/lib/types";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function ChapterList({ clips, onSeek }: { clips: Clip[]; onSeek: (t: number) => void }) {
  return (
    <ol className="divide-y divide-line">
      {clips.map((c) => (
        <li key={c.id}>
          <button onClick={() => onSeek(c.start)} className="flex w-full gap-4 py-4 text-left transition-colors hover:bg-raised/60">
            <span className="w-12 shrink-0 font-mono text-xs text-moss">{fmt(c.start)}</span>
            <span><span className="block font-light">{c.title}</span><span className="mt-1 block text-sm text-muted">{c.summary}</span></span>
          </button>
        </li>
      ))}
    </ol>
  );
}