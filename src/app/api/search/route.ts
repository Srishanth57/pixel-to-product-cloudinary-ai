import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/clients";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() || "";

    // Build search expression
    let expression = "resource_type:video";
    if (q) {
      // Escape special characters for Cloudinary search expression
      const cleanQ = q.replace(/[:\\()]/g, " ");
      expression += ` AND (tags:${cleanQ}* OR context.topic:*${cleanQ}* OR context.summary:*${cleanQ}* OR public_id:*${cleanQ}*)`;
    }

    try {
      const res = await cloudinary.search
        .expression(expression)
        .with_field("context")
        .with_field("tags")
        .sort_by("created_at", "desc")
        .max_results(30)
        .execute();

      const items = (res.resources || []).map((r: any) => ({
        id: r.public_id,
        url: r.secure_url || cloudinary.url(r.public_id, { resource_type: "video", format: "mp4" }),
        topic: r.context?.custom?.topic || r.display_name || r.public_id.split("/").pop(),
        summary: r.context?.custom?.summary || "Indexed Cloudinary video asset",
        start: r.context?.custom?.start || "0",
        tags: r.tags || [],
        duration: r.duration || 0,
        createdAt: r.created_at,
        thumb: cloudinary.url(r.public_id, {
          resource_type: "video",
          start_offset: "auto",
          format: "jpg",
        }),
      }));

      return NextResponse.json({ resources: items, total: res.total_count || items.length });
    } catch (searchErr) {
      console.warn("Cloudinary search expression failed, falling back to resources API:", searchErr);
      const res = await cloudinary.api.resources({
        resource_type: "video",
        max_results: 20,
      });

      const fallbackItems = (res.resources || []).map((r: any) => ({
        id: r.public_id,
        url: r.secure_url || cloudinary.url(r.public_id, { resource_type: "video", format: "mp4" }),
        topic: r.display_name || r.public_id.split("/").pop(),
        summary: "Cloudinary Video Resource",
        start: "0",
        tags: r.tags || [],
        duration: r.duration || 0,
        createdAt: r.created_at,
        thumb: cloudinary.url(r.public_id, {
          resource_type: "video",
          start_offset: "auto",
          format: "jpg",
        }),
      }));

      return NextResponse.json({ resources: fallbackItems, total: fallbackItems.length });
    }
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json({ error: error?.message || "Search failed", resources: [] }, { status: 500 });
  }
}