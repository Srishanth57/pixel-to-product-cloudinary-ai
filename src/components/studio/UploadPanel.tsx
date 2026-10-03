"use client";
import { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { uploadFile, processMedia } from "@/lib/api";
import type { ProcessResult } from "@/lib/types";

export default function UploadPanel({ onDone }: { onDone: (r: ProcessResult) => void }) {
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");
  const [error, setError] = useState("");

  async function run(file: File) {
    setError("");
    try {
      setPhase("uploading");
      const { public_id } = await uploadFile(file);
      setPhase("processing");
      onDone(await processMedia(public_id));
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setPhase("idle");
  }

  const busy = phase !== "idle";
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
      <label className={`mx-auto flex max-w-sm cursor-pointer flex-col items-center gap-4 ${busy ? "pointer-events-none" : ""}`}>
        {busy ? <Loader2 className="size-8 animate-spin text-moss" strokeWidth={1.5} /> : <UploadCloud className="size-8 text-moss" strokeWidth={1.5} />}
        <span className="text-lg font-light">{phase === "uploading" ? "Uploading your file" : phase === "processing" ? "Transcribing, chaptering and clipping" : "Choose a video or audio file"}</span>
        <span className="text-sm text-muted">{busy ? "Long files can take a few minutes." : "MP4, MOV, MP3 and WAV are supported."}</span>
        <input type="file" accept="video/*,audio/*" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
      </label>
      {error && <p role="alert" className="mt-6 text-sm text-red-300">{error}</p>}
    </div>
  );
}