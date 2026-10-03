import { cloudinary } from "./clients";
import { num } from "./http";
import { cleanId } from "./ids";
import type { Moment } from "./types";

export const REEL_MIN = 20;
export const REEL_TARGET = 25;
export const REEL_MAX = 30;
const MAX_PIECE_SECONDS = 10;

const total = (ms: Moment[]) => ms.reduce((n, m) => n + (m.end - m.start), 0);

/** Sort by start and merge overlapping or touching moments. */
function merge(ms: Moment[]): Moment[] {
  const out: Moment[] = [];
  for (const m of [...ms].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && m.start <= last.end) last.end = Math.max(last.end, m.end);
    else out.push({ ...m });
  }
  return out;
}

/**
 * Turn the AI's picks into a reel of 20 to 30 seconds. Picks are clamped and merged, short reels are
 * padded around each moment, long reels are trimmed. A video of 20 seconds or less is used whole.
 */
export function planMoments(raw: unknown, duration: number): Moment[] {
  if (duration <= REEL_MIN) return [{ start: 0, end: duration }];

  let ms = (Array.isArray(raw) ? raw : [])
    .map((m): Moment => {
      const start = Math.min(Math.max(0, num(m?.start)), duration - 1);
      return { start, end: Math.min(duration, start + MAX_PIECE_SECONDS, num(m?.end, start + 8)) };
    })
    .filter((m) => m.end - m.start >= 2);

  // Nothing usable from the model: sample three spots spread across the video.
  if (!ms.length) {
    ms = [0.1, 0.45, 0.75].map((f) => ({ start: f * duration, end: Math.min(duration, f * duration + 8) }));
  }
  ms = merge(ms);

  // Too short: grow every moment evenly on both sides until the reel is long enough.
  for (let i = 0; i < 12 && total(ms) < REEL_MIN; i++) {
    const pad = (REEL_TARGET - total(ms)) / (2 * ms.length);
    ms = merge(ms.map((m) => ({ start: Math.max(0, m.start - pad), end: Math.min(duration, m.end + pad) })));
  }

  // Too long: shorten each moment from its end, keeping the start.
  const sum = total(ms);
  if (sum > REEL_MAX) {
    const k = REEL_TARGET / sum;
    ms = ms.map((m) => ({ start: m.start, end: m.start + (m.end - m.start) * k }));
  }

  return ms.map((m) => ({ start: Math.round(m.start * 10) / 10, end: Math.round(m.end * 10) / 10 }));
}

const trimmedUrl = (publicId: string, m: Moment) =>
  cloudinary.url(publicId, {
    resource_type: "video",
    format: "mp4",
    transformation: [{ start_offset: m.start, end_offset: m.end }],
  });

/**
 * Build the highlight reel. Each moment is saved as its own short asset, then the pieces are joined
 * end to end. Joining pre-trimmed assets avoids relying on trims inside the join command.
 */
export async function buildReel(publicId: string, moments: Moment[], duration: number): Promise<string> {
  if (moments.length === 1) return trimmedUrl(publicId, moments[0]);

  const source = cleanId(publicId);
  const ids = await Promise.all(
    moments.map(async (m, i) => {
      const id = `echo_moments/${source}_m${i + 1}`;
      try {
        await cloudinary.uploader.upload(trimmedUrl(publicId, m), {
          resource_type: "video",
          public_id: id,
          overwrite: true,
          invalidate: true,
        });
        return id;
      } catch (err) {
        console.warn(`Highlight piece ${id} failed, skipping it:`, err);
        return null;
      }
    }),
  );

  const [base, ...rest] = ids.filter((id): id is string => id !== null);

  // Joining did not work out: fall back to one continuous 25 second excerpt, never a 5 second stub.
  if (!base || !rest.length) {
    const start = moments[0].start;
    const end = Math.min(duration, start + REEL_TARGET);
    return trimmedUrl(publicId, { start: Math.max(0, Math.min(start, end - REEL_TARGET)), end });
  }

  return cloudinary.url(base, {
    resource_type: "video",
    format: "mp4",
    transformation: rest.flatMap((id) => [
      { overlay: `video:${id.replace(/\//g, ":")}`, flags: "splice" },
      { flags: "layer_apply" },
    ]),
  });
}

/** Same video, but served with a Content-Disposition header so the browser saves it instead of playing it. */
export function asDownload(url: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
  return url.replace("/upload/", `/upload/fl_attachment:${safe}/`);
}
