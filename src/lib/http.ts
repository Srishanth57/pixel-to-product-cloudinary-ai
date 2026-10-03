import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Provider SDKs often put a JSON blob in `message`. Pull out the readable part. */
function readable(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const inner = parsed?.error?.message ?? parsed?.message;
    if (typeof inner === "string" && inner) return inner.slice(0, 300);
  } catch {
    /* not JSON */
  }
  return raw.slice(0, 300);
}

/** One place that turns any thrown value into a JSON error response. */
export function fail(err: unknown, fallback: string) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(fallback, err);
  return NextResponse.json({ error: readable(err, fallback) }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "Request body must be valid JSON");
}

export const UPLOAD_FOLDER = "echochapters_uploads";

/** Only assets this app uploaded may be processed, so the endpoint can't be pointed at the rest of the account. */
export function assertPublicId(v: unknown): string {
  if (
    typeof v !== "string" ||
    v.length > 200 ||
    v.includes("..") ||
    !v.startsWith(`${UPLOAD_FOLDER}/`) ||
    !/^[\p{L}\p{N}_\-./ ()]+$/u.test(v)
  ) {
    throw new HttpError(400, "Invalid publicId");
  }
  return v;
}

export const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
