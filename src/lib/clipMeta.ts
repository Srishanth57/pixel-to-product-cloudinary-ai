import { cleanId } from "./ids";
import type { SearchItem } from "./types";

const GENERIC = /^(indexed cloudinary video asset|cloudinary video resource)$/i;

/** Drop pipeline-internal tags (the batch tag and this clip's source id) and duplicates. */
export function cleanTags(item: SearchItem): string[] {
  const sourceTag = item.source ? cleanId(item.source) : "";
  const seen = new Set<string>();
  return item.tags.filter((t) => {
    const k = t.toLowerCase();
    if (k === "echochapters" || t === sourceTag || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Readable title: stored chapter topic, else a prettified file name. */
export function prettyTitle(item: SearchItem): string {
  const base = item.topic.split("/").pop() ?? item.topic;
  return base.replace(/_ch\d+$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

/** Real summary when one exists, otherwise a line built from the tags. */
export function describe(item: SearchItem, tags: string[]): string {
  if (item.summary && !GENERIC.test(item.summary.trim())) return item.summary;
  return tags.length ? `Covers ${tags.slice(0, 3).join(", ")}.` : "No description yet.";
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
