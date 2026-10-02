import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/clients";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")!;
  try {
    const r = await cloudinary.uploader.explicit(id, {
      resource_type: "video",
      type: "upload",
      raw_convert: "google_speech",
    });
    return NextResponse.json(r.info ?? r);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, details: e }, { status: 500 });
  }
}