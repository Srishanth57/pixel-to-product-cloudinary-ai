"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import type { ProcessResult } from "@/lib/types";
import ChapterList from "./ChapterList";
import SubtitlePanel, { type Track } from "./SubtitlePanel";

export default function ResultsView({ data }: { data: ProcessResult }) {
  const video = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [active, setActive] = useState("");
  const [caption, setCaption] = useState("");
  const seek = (t: number) => {
    if (video.current) {
      video.current.currentTime = t;
      video.current.play();
    }
  };
  const { stats } = data;
  const cues = tracks.find((t) => t.lang === active)?.cues ?? [];

  // Captions are drawn from the translated cues, so they show regardless of CORS or track-mode quirks.
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
  }, [cues]);

  const addTrack = (t: Track) => {
    setTracks((p) => [...p.filter((x) => x.lang !== t.lang), t]);
    setActive(t.lang);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div
          ref={stage}
          className="relative overflow-hidden rounded-xl bg-surface"
        >
          <video
            ref={video}
            src={data.mediaUrl}
            poster={data.thumb}
            controls
            controlsList="nofullscreen"
            className="aspect-video w-full"
          />
          {caption && (
            <p
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 bottom-14 mx-auto w-fit max-w-[90%] rounded-md bg-black/75 px-3 py-1.5 text-center text-base text-white"
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
        {tracks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Captions</span>
            {["", ...tracks.map((t) => t.lang)].map((l) => (
              <button
                key={l || "off"}
                onClick={() => setActive(l)}
                className={`rounded-lg px-3 py-1.5 ${active === l ? "bg-raised text-mist" : "text-muted hover:text-mist"}`}
              >
                {l || "Off"}
              </button>
            ))}
            {tracks
              .filter((t) => t.lang === active)
              .map((t) => (
                <a
                  key={t.url}
                  href={t.url}
                  className="ml-auto text-moss hover:underline"
                >
                  Download VTT
                </a>
              ))}
          </div>
        )}
        <p className="font-mono text-xs text-muted">
          {stats.chaptersCount} chapters, {stats.totalWords} words,{" "}
          {stats.highlightsCount} highlights, processed in{" "}
          {stats.elapsedSeconds}s
        </p>
        <SubtitlePanel
          publicId={data.publicId}
          segs={data.segs}
          onTrack={addTrack}
        />
        <div>
          <h3 className="font-light">Highlight reel</h3>
          <video
            src={data.reel}
            controls
            className="aspect-video w-full rounded-xl bg-surface"
          />
        </div>
      </div>
      <aside className="lg:col-span-2">
        <h3 className="mb-2 text-xl font-light">Chapters</h3>
        <ChapterList clips={data.clips} onSeek={seek} />
      </aside>
    </div>
  );
}
