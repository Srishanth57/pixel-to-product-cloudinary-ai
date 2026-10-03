"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Maximize } from "lucide-react";
import type { Cue } from "@/lib/types";

/** Video player with a small caption overlay driven by timed cues. Fullscreen keeps the captions. */
export default function CaptionedVideo({
  src,
  poster,
  cues,
  videoRef,
}: {
  src: string;
  poster?: string;
  cues: Cue[];
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const own = useRef<HTMLVideoElement>(null);
  const video = videoRef ?? own;
  const stage = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const tick = () => {
      const c = cues.find((x) => v.currentTime >= x.s && v.currentTime <= x.e);
      setCaption((p) => (p === (c?.t ?? "") ? p : (c?.t ?? "")));
    };
    tick();
    v.addEventListener("timeupdate", tick);
    v.addEventListener("seeked", tick);
    return () => {
      v.removeEventListener("timeupdate", tick);
      v.removeEventListener("seeked", tick);
    };
  }, [cues, video]);

  return (
    <div ref={stage} className="relative overflow-hidden rounded-xl bg-surface">
      <video ref={video} src={src} poster={poster} controls controlsList="nofullscreen" className="aspect-video w-full" />
      {caption && (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-14 mx-auto w-fit max-w-[90%] rounded-md bg-black/75 px-3 py-1.5 text-center text-sm text-white sm:text-base"
        >
          {caption}
        </p>
      )}
      <button
        onClick={() => stage.current?.requestFullscreen()}
        aria-label="Fullscreen"
        className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white hover:bg-black/70"
      >
        <Maximize className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
