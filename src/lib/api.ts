import type { Cue, ProcessResult, SearchItem, Seg } from "./types";

const STATUS_HINTS: Record<number, string> = {
  408: "The request timed out. Try a shorter file.",
  413: "That file is too large.",
  504: "The server timed out while processing. Try a shorter file.",
};

/** fetch + JSON with readable errors for network failures, timeouts and non-JSON error pages. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* body was not JSON */
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || STATUS_HINTS[res.status] || `Request failed (${res.status})`);
  }
  if (data == null) throw new Error("The server sent an empty response.");
  return data as T;
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const uploadFile = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<{ public_id: string }>("/api/upload", { method: "POST", body: form });
};
export const processMedia = (publicId: string) => post<ProcessResult>("/api/process", { publicId });
export const searchLibrary = (q: string) =>
  request<{ resources: SearchItem[]; total: number }>(`/api/search?q=${encodeURIComponent(q)}`);
export const makeSubtitles = (publicId: string, lang: string, segs: Seg[]) =>
  post<{ lang: string; url: string; cues: Cue[] }>("/api/subtitles", { publicId, lang, segs });
