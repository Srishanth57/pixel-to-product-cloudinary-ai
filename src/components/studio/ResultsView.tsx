"use client";
import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { ProcessResult } from "@/lib/types";
import CaptionedVideo from "./CaptionedVideo";
import ChapterList from "./ChapterList";
import SubtitlePanel, { type Track } from "./SubtitlePanel";

export default function ResultsView({ data }: { data: ProcessResult }) {
  const video = useRef<HTMLVideoElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [active, setActive] = useState("");
  const { stats } = data;
  const cues = useMemo(() => tracks.find((t) => t.lang === active)?.cues ?? [], [tracks, active]);

  const seek = (t: number) => {
    if (video.current) {
      video.current.currentTime = t;
      video.current.play();
    }
  };
  const addTrack = (t: Track) => {
    setTracks((p) => [...p.filter((x) => x.lang !== t.lang), t]);
    setActive(t.lang);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <CaptionedVideo src={data.mediaUrl} poster={data.thumb} cues={cues} videoRef={video} />
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
                <a key={t.url} href={t.url} className="ml-auto text-moss hover:underline">
                  Download VTT
                </a>
              ))}
          </div>
        )}
        <p className="font-mono text-xs text-muted">
          {stats.chaptersCount} chapters, {stats.totalWords} words, {stats.highlightsCount} highlights, processed in{" "}
          {stats.elapsedSeconds}s
        </p>
        <SubtitlePanel publicId={data.publicId} segs={data.segs} onTrack={addTrack} />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-light">Highlight reel</h3>
            <a href={data.reelDownload} className="btn btn-ghost">
              <Download className="size-4" strokeWidth={1.5} />
              Download
            </a>
          </div>
          <video src={data.reel} controls className="aspect-video w-full rounded-xl bg-surface" />
        </div>
      </div>
      <aside className="lg:col-span-2">
        <h3 className="mb-2 text-xl font-light">Chapters</h3>
        <ChapterList clips={data.clips} onSeek={seek} />
      </aside>
    </div>
  );
}
