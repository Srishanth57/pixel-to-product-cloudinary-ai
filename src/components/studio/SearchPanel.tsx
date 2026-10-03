"use client";
import { useState } from "react";
import { Search, Play, Clock } from "lucide-react";
import { searchLibrary } from "@/lib/api";
import { cleanTags, describe, fmtTime, prettyTitle } from "@/lib/clipMeta";
import type { SearchItem } from "@/lib/types";

export default function SearchPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [playing, setPlaying] = useState("");
  const [error, setError] = useState("");

  async function run(term: string) {
    setError("");
    setPlaying("");
    try {
      setItems((await searchLibrary(term)).resources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }
  const pickTag = (t: string) => {
    setQ(t);
    run(t);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
        className="flex gap-3"
      >
        <label htmlFor="q" className="sr-only">
          Search clips
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics, tags or summaries"
          className="flex-1 rounded-lg border border-line bg-raised px-4 py-2.5 text-sm placeholder:text-muted"
        />
        <button className="btn btn-primary">
          <Search className="size-4" strokeWidth={1.5} />
          Search
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      {items && items.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          No clips match yet. Process a video to build your library.
        </p>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((r) => {
          const tags = cleanTags(r);
          return (
            <li
              key={r.id}
              className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface"
            >
              {playing === r.id ? (
                <video
                  src={r.url}
                  controls
                  autoPlay
                  className="aspect-video w-full bg-black"
                />
              ) : (
                <button
                  onClick={() => setPlaying(r.id)}
                  aria-label={`Play ${prettyTitle(r)}`}
                  className="group relative block aspect-video w-full overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.thumb}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-8 text-white" strokeWidth={1.5} />
                  </span>
                  {r.duration > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
                      {fmtTime(r.duration)}
                    </span>
                  )}
                </button>
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="text-lg font-light leading-snug tracking-tight">
                  {prettyTitle(r)}
                </h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                  {describe(r, tags)}
                </p>
                {Number(r.start) > 0 && (
                  <p className="flex items-center gap-1.5 font-mono text-xs text-muted">
                    <Clock className="size-3.5" strokeWidth={1.5} />
                    From {fmtTime(Number(r.start))} in the source
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {tags.slice(0, 5).map((t) => (
                      <button
                        key={t}
                        onClick={() => pickTag(t)}
                        className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-mist/80 transition-colors hover:border-moss hover:text-moss"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
