import { NextResponse } from "next/server";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "@/lib/clients";
import { HttpError, UPLOAD_FOLDER, fail } from "@/lib/http";

export const maxDuration = 120;

const MAX_BYTES = 100 * 1024 * 1024; // Cloudinary's free-plan video limit

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new HttpError(400, "Expected a multipart form upload");
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "No file provided");
    if (!/^(video|audio)\//.test(file.type)) throw new HttpError(415, "Only video and audio files are supported");
    if (file.size > MAX_BYTES) throw new HttpError(413, "File is too large. The limit is 100 MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: UPLOAD_FOLDER, use_filename: true, unique_filename: true },
        (error, res) => (error || !res ? reject(error ?? new Error("Upload returned no result")) : resolve(res)),
      );
      stream.end(buffer);
    });

    return NextResponse.json({ public_id: result.public_id });
  } catch (err) {
    return fail(err, "Upload failed");
  }
}
