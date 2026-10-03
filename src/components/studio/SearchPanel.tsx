"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { searchLibrary } from "@/lib/api";
import type { SearchItem } from "@/lib/types";

export default function SearchPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [error, setError] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try { setItems((await searchLibrary(q)).resources); } catch (err) { setError(err instanceof Error ? err.message : "Search failed"); }
  }
  return (
    <div>
      <form onSubmit={go} className="flex gap-3">
        <label htmlFor="q" className="sr-only">Search clips</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics, tags or summaries" className="flex-1 rounded-lg border border-line bg-raised px-4 py-2.5 text-sm placeholder:text-muted" />
        <button className="btn btn-primary"><Search className="size-4" strokeWidth={1.5} />Search</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      {items && items.length === 0 && <p className="mt-6 text-sm text-muted">No clips match yet. Process a video to build your library.</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((r) => (
          <li key={r.id} className="overflow-hidden rounded-xl border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.thumb} alt="" className="aspect-video w-full object-cover" />
            <div className="p-4"><a href={r.url} target="_blank" rel="noreferrer" className="font-light hover:text-moss">{r.topic}</a><p className="mt-1 line-clamp-2 text-sm text-muted">{r.summary}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}