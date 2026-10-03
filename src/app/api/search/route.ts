import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/clients";
import { fail } from "@/lib/http";
import type { SearchItem } from "@/lib/types";

const CLIP_TAG = "echochapters";

type Resource = {
  public_id: string;
  secure_url?: string;
  display_name?: string;
  tags?: string[];
  duration?: number;
  context?: { custom?: Record<string, string> };
};

function toItem(r: Resource): SearchItem {
  const ctx = r.context?.custom ?? {};
  return {
    id: r.public_id,
    url: r.secure_url || cloudinary.url(r.public_id, { resource_type: "video", format: "mp4" }),
    topic: ctx.topic || r.display_name || r.public_id.split("/").pop() || r.public_id,
    summary: ctx.summary || "",
    start: ctx.start || "0",
    source: ctx.source || "",
    tags: r.tags ?? [],
    duration: Number(ctx.duration) || r.duration || 0,
    thumb: cloudinary.url(r.public_id, { resource_type: "video", start_offset: "auto", format: "jpg" }),
  };
}

/** Letters, numbers and underscores only, so user input can never alter the search expression. */
function tokens(q: string): string[] {
  return q.replace(/[^\p{L}\p{N}_]+/gu, " ").split(/\s+/).filter(Boolean).slice(0, 5);
}

const haystack = (i: SearchItem) => `${i.topic} ${i.summary} ${i.tags.join(" ")}`.toLowerCase();

export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 100);
    const words = tokens(q);

    const expression = [
      `resource_type:video AND tags=${CLIP_TAG}`,
      ...words.map((w) => `(tags:${w}* OR context.topic:*${w}* OR context.summary:*${w}* OR public_id:*${w}*)`),
    ].join(" AND ");

    let items: SearchItem[];
    try {
      const res = await cloudinary.search
        .expression(expression)
        .with_field("context")
        .with_field("tags")
        .sort_by("created_at", "desc")
        .max_results(30)
        .execute();
      items = ((res.resources ?? []) as Resource[]).map(toItem);
    } catch (searchErr) {
      // Search API unavailable on some plans. List by tag and filter in memory instead.
      console.warn("Cloudinary Search API failed, falling back to tag listing:", searchErr);
      const res = await cloudinary.api.resources_by_tag(CLIP_TAG, {
        resource_type: "video",
        max_results: 100,
        context: true,
        tags: true,
      });
      items = ((res.resources ?? []) as Resource[])
        .map(toItem)
        .filter((i) => words.every((w) => haystack(i).includes(w.toLowerCase())))
        .slice(0, 30);
    }

    return NextResponse.json({ resources: items, total: items.length });
  } catch (err) {
    return fail(err, "Search failed");
  }
}
