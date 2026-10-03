import type { Cue, ProcessResult, SearchItem, Seg } from "./types";

async function json<T>(r: Response): Promise<T> {
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Request failed");
  return d as T;
}
const post = <T>(url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<T>(r));

export const uploadFile = (file: File) => {
  const f = new FormData();
  f.append("file", file);
  return fetch("/api/upload", { method: "POST", body: f }).then((r) =>
    json<{ public_id: string }>(r),
  );
};
export const processMedia = (publicId: string) =>
  post<ProcessResult>("/api/process", { publicId });
export const searchLibrary = (q: string) =>
  fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) =>
    json<{ resources: SearchItem[]; total: number }>(r),
  );
export const makeSubtitles = (publicId: string, lang: string, segs: Seg[]) =>
  post<{ lang: string; url: string; cues: Cue[] }>("/api/subtitles", {
    publicId,
    lang,
    segs,
  });
