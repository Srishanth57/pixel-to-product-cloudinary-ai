"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Sparkles,
  Film,
  FileText,
  Globe,
  Search,
  Play,
  Clock,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Download,
  Zap,
  Layers,
  ChevronRight,
  Info,
  Video,
  AlertCircle,
  CheckCircle2,
  Share2,
  RefreshCw,
  Eye,
  Sliders,
  X,
} from "lucide-react";

const CLOUD = process.env.NEXT_PUBLIC_CLOUD_NAME || "diagj36ul";

interface SubtitleTrack {
  lang: string;
  url: string;
  flag: string;
}

interface ChapterClip {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  start: number;
  end: number;
  duration?: number;
  url: string;
  thumb: string;
}

interface ProcessedData {
  publicId: string;
  mediaUrl: string;
  duration: number;
  clips: ChapterClip[];
  reel: string;
  picks: Array<{ start: number; end: number }>;
  thumb: string;
  segs: Array<{ i: number; s: number; e: number; t: string }>;
  stats?: {
    totalSegments: number;
    totalWords: number;
    chaptersCount: number;
    highlightsCount: number;
    elapsedSeconds: string;
  };
}

const SUPPORTED_LANGUAGES = [
  { name: "Spanish", flag: "🇪🇸" },
  { name: "Hindi", flag: "🇮🇳" },
  { name: "French", flag: "🇫🇷" },
  { name: "German", flag: "🇩🇪" },
  { name: "Japanese", flag: "🇯🇵" },
  { name: "Malayalam", flag: "🌴" },
  { name: "Mandarin", flag: "🇨🇳" },
  { name: "Arabic", flag: "🇸🇦" },
];

const DEMO_SAMPLES = [
  {
    title: "Harvard Speech Demo",
    desc: "Acoustic audio benchmark with speech sentences",
    publicId: "vb2h7vajzdhojvk2ht5o",
    type: "Audio/Speech",
    badge: "Fast 10s Demo",
  },
  {
    title: "Flam Tech Demo Presentation",
    desc: "Interactive video with lecture & interface talk",
    publicId: "flam-demo-video_t0zi6a",
    type: "Video",
    badge: "Full Lecture Demo",
  },
  {
    title: "Dance & Motion Showcase",
    desc: "Dynamic motion visual clip from Cloudinary",
    publicId: "samples/dance-2",
    type: "Video",
    badge: "Visual Showcase",
  },
];

export default function EchoChaptersApp() {
  const [activeTab, setActiveTab] = useState<"studio" | "library" | "architecture">("studio");
  const [statusText, setStatusText] = useState("");
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Studio State
  const [data, setData] = useState<ProcessedData | null>(null);
  const [subs, setSubs] = useState<SubtitleTrack[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  // Library State
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [previewModalItem, setPreviewModalItem] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Upload file helper
  async function uploadFileToCloudinary(f: File): Promise<{ public_id: string; secure_url?: string }> {
    setPipelineStep(1);
    setStatusText("Uploading media asset to Cloudinary CDN...");

    // 1. Unsigned direct upload attempt
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("upload_preset", "echo_preset");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
        method: "POST",
        body: fd,
      });
      const resJson = await res.json();
      if (res.ok && resJson.public_id) {
        return { public_id: resJson.public_id, secure_url: resJson.secure_url };
      }
    } catch (err) {
      console.warn("Direct upload fallback triggered:", err);
    }

    // 2. Fallback to server streaming route
    const serverFd = new FormData();
    serverFd.append("file", f);
    const serverRes = await fetch("/api/upload", {
      method: "POST",
      body: serverFd,
    });
    if (!serverRes.ok) {
      const errData = await serverRes.json().catch(() => ({}));
      throw new Error(errData.error || "Server upload failed");
    }
    const serverJson = await serverRes.json();
    return { public_id: serverJson.public_id, secure_url: serverJson.url };
  }

  // Handle file input
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setLoading(true);
    setData(null);
    setSubs([]);

    try {
      const uploadRes = await uploadFileToCloudinary(file);
      await processMediaId(uploadRes.public_id);
    } catch (err: any) {
      console.error("Pipeline Error:", err);
      setErrorMessage(err?.message || "An error occurred during upload or pipeline execution.");
      setStatusText("Pipeline failed ❌");
    } finally {
      setLoading(false);
    }
  }

  // Run processing pipeline on a publicId
  async function processMediaId(publicId: string) {
    setErrorMessage(null);
    setLoading(true);
    setData(null);
    setSubs([]);

    try {
      setPipelineStep(2);
      setStatusText("Extracting audio stream & transcribing speech with Gemini 2.5 Flash...");

      const r = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });

      setPipelineStep(3);
      setStatusText("Generating smart chapters, video clips & AI promo reel...");

      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to process media");
      }

      const processed: ProcessedData = await r.json();
      setPipelineStep(4);
      setStatusText("Pipeline complete! All video intelligence assets ready 🚀");
      setData(processed);
      setActiveTab("studio");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Processing failed");
      setStatusText("Error in pipeline");
    } finally {
      setLoading(false);
    }
  }

  // Add multilingual subtitle
  async function addSubtitleLanguage(langName: string, flag: string) {
    if (!data?.segs || !data.publicId) return;
    setSubLoading(langName);

    try {
      const r = await fetch("/api/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: data.publicId,
          lang: langName,
          segs: data.segs,
        }),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`Subtitle generation failed: ${err.error || r.statusText}`);
        return;
      }

      const subData = await r.json();
      setSubs((prev) => [
        ...prev.filter((s) => s.lang !== langName),
        { lang: langName, url: subData.url, flag },
      ]);
    } catch (err: any) {
      alert(`Subtitle translation error: ${err?.message || "Unknown error"}`);
    } finally {
      setSubLoading(null);
    }
  }

  // Seek video player
  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, seconds);
      videoRef.current.play().catch(() => {});
    }
  };

  // Fetch library items
  async function searchLibrary(queryStr: string = libraryQuery) {
    setLibraryLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryStr)}`);
      if (res.ok) {
        const resData = await res.json();
        setLibraryResults(resData.resources || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLibraryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "library" && libraryResults.length === 0) {
      searchLibrary("");
    }
  }, [activeTab]);

  // Track video playback time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      if (data?.clips) {
        const idx = data.clips.findIndex(
          (c) => cur >= c.start && cur <= c.end
        );
        if (idx !== -1 && idx !== activeChapterIndex) {
          setActiveChapterIndex(idx);
        }
      }
    }
  };

  // Filtered transcript segments
  const filteredTranscript = data?.segs?.filter((s) =>
    transcriptSearch
      ? s.t.toLowerCase().includes(transcriptSearch.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  EchoChapters
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Track 3 • Media-Savvy
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Cloudinary Media Engine ⚡ + Google Gemini 2.5 Flash 🧠
              </p>
            </div>
          </div>

          {/* Navigation Switcher */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveTab("studio")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "studio"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio & Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "library"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Indexed Clip Search</span>
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "architecture"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Architecture</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ================= TAB 1: STUDIO & PIPELINE ================= */}
        {activeTab === "studio" && (
          <div className="space-y-8">
            {/* Upload Zone & Quick Samples */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Drag and Drop Zone */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 sm:p-8 transition-all group shadow-xl">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
                    <UploadCloud className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Upload Video or Audio Lecture
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Drag & drop any video or audio file. EchoChapters will automatically transcribe, chapter, generate multilingual captions, create searchable clips, and build a promo highlight reel.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition active:scale-95">
                      <Film className="w-4 h-4" />
                      <span>Select Media File</span>
                      <input
                        type="file"
                        accept="video/*,audio/*"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">
                      MP4, MOV, WEBM, WAV, MP3, M4A
                    </span>
                  </div>
                </div>

                {/* Loading / Pipeline Stepper overlay */}
                {loading && (
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium text-cyan-400 mb-3">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>{statusText}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 max-w-xl mx-auto text-center">
                      <div className={`p-2 rounded-lg border text-[11px] font-medium transition-all ${pipelineStep >= 1 ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                        1. Cloudinary Upload
                      </div>
                      <div className={`p-2 rounded-lg border text-[11px] font-medium transition-all ${pipelineStep >= 2 ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                        2. Gemini STT
                      </div>
                      <div className={`p-2 rounded-lg border text-[11px] font-medium transition-all ${pipelineStep >= 3 ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                        3. Chapter & Clip
                      </div>
                      <div className={`p-2 rounded-lg border text-[11px] font-medium transition-all ${pipelineStep >= 4 ? "bg-green-500/20 border-green-500 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                        4. Promo Reel
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* 1-Click Demo Samples Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Instant 1-Click Samples
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Test the complete AI pipeline immediately without uploading your own file:
                  </p>

                  <div className="space-y-2.5">
                    {DEMO_SAMPLES.map((sample) => (
                      <button
                        key={sample.publicId}
                        onClick={() => processMediaId(sample.publicId)}
                        disabled={loading}
                        className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/70 hover:border-cyan-500/40 transition flex items-center justify-between group cursor-pointer"
                      >
                        <div className="pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition">
                              {sample.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {sample.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {sample.desc}
                          </p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-black flex items-center justify-center transition shrink-0">
                          <Play className="w-3 h-3 ml-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Cloud: <code className="text-cyan-400">{CLOUD}</code></span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Results Workspace */}
            {data && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Stats Bar */}
                {data.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Speech Segments</span>
                      <p className="text-lg font-black text-cyan-400">{data.stats.totalSegments}</p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Words Transcribed</span>
                      <p className="text-lg font-black text-blue-400">{data.stats.totalWords}</p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Auto-Generated Chapters</span>
                      <p className="text-lg font-black text-indigo-400">{data.stats.chaptersCount}</p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Pipeline Time</span>
                      <p className="text-lg font-black text-emerald-400">{data.stats.elapsedSeconds}s</p>
                    </div>
                  </div>
                )}

                {/* Main Player & Interactive Transcript Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Video Player with Chapter Scrubbing & Subtitle Tracks */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-white">
                            Interactive Smart Player
                          </h3>
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {formatTime(currentTime)} / {formatTime(data.duration)}
                        </span>
                      </div>

                      {/* Video Player Element */}
                      <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                        <video
                          ref={videoRef}
                          key={subs.length} // Force re-render on subtitle update
                          controls
                          onTimeUpdate={handleTimeUpdate}
                          className="w-full h-full object-contain"
                          poster={data.thumb}
                          src={data.mediaUrl}
                          crossOrigin="anonymous"
                        >
                          {subs.map((s) => (
                            <track
                              key={s.lang}
                              kind="subtitles"
                              label={`${s.flag} ${s.lang}`}
                              srcLang={s.lang.slice(0, 2).toLowerCase()}
                              src={s.url}
                              default={s.lang === subs[subs.length - 1]?.lang}
                            />
                          ))}
                        </video>
                      </div>

                      {/* Chapter Progress Bar Scrubbing */}
                      {data.clips && data.clips.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                            <span>Chapter Timeline (Click to seek):</span>
                            <span className="text-cyan-400 font-semibold truncate max-w-[200px]">
                              {data.clips[activeChapterIndex]?.title || "Chapter"}
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-950 rounded-full flex overflow-hidden border border-slate-800 gap-0.5 p-0.5">
                            {data.clips.map((clip, i) => {
                              const widthPct = Math.max(5, ((clip.end - clip.start) / data.duration) * 100);
                              const isCurrent = activeChapterIndex === i;
                              return (
                                <button
                                  key={clip.id || i}
                                  onClick={() => seekTo(clip.start)}
                                  title={`${clip.title} (${formatTime(clip.start)} - ${formatTime(clip.end)})`}
                                  style={{ width: `${widthPct}%` }}
                                  className={`h-full rounded-sm transition-all ${
                                    isCurrent
                                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md shadow-cyan-500/50 ring-1 ring-white"
                                      : "bg-slate-700 hover:bg-slate-500"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Multilingual AI Captions Panel */}
                      <div className="mt-4 pt-4 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-bold text-slate-200">
                              Multilingual Subtitle Engine (Gemini AI + Cloudinary VTT)
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {subs.length} active
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {SUPPORTED_LANGUAGES.map((lang) => {
                            const isAdded = subs.some((s) => s.lang === lang.name);
                            const isLoading = subLoading === lang.name;
                            return (
                              <button
                                key={lang.name}
                                onClick={() => addSubtitleLanguage(lang.name, lang.flag)}
                                disabled={isLoading || isAdded}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                  isAdded
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                                    : isLoading
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse cursor-wait"
                                    : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                                }`}
                              >
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                                {isLoading && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
                                {isAdded && <Check className="w-3 h-3 text-emerald-400 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Interactive Clickable Transcript & Search */}
                  <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col h-[520px] shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">
                          Clickable AI Transcript
                        </h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                        Click segment to seek
                      </span>
                    </div>

                    {/* Transcript Search Bar */}
                    <div className="my-3 relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        placeholder="Search dialogue keywords..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>

                    {/* Segments Scroll Area */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {filteredTranscript && filteredTranscript.length > 0 ? (
                        filteredTranscript.map((seg) => {
                          const isActive = currentTime >= seg.s && currentTime <= seg.e;
                          return (
                            <div
                              key={seg.i}
                              onClick={() => seekTo(seg.s)}
                              className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                                isActive
                                  ? "bg-cyan-500/15 border-cyan-500 text-cyan-100 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-400/40"
                                  : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                                  {formatTime(seg.s)} - {formatTime(seg.e)}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                                    ▶ Now Playing
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed">{seg.t}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-slate-400">
                          No matching transcript segments
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Promo Reel Highlight Studio */}
                {data.reel && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/30 p-6 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                            Cloudinary Spliced Transformation
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                          <span>✨ AI-Curated Promo Reel</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Gemini selected the most impactful soundbites; Cloudinary dynamically stitched the video timestamps.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(data.reel, "reel")}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                        >
                          {copiedKey === "reel" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === "reel" ? "Copied Reel URL" : "Copy Reel URL"}</span>
                        </button>
                        <a
                          href={data.reel}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export MP4</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      <div className="lg:col-span-2 relative overflow-hidden rounded-xl bg-black aspect-video shadow-xl ring-1 ring-white/10">
                        <video controls className="w-full h-full object-contain" src={data.reel} />
                      </div>

                      <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Spliced Highlight Breakdown
                        </h4>
                        <div className="space-y-2">
                          {data.picks?.map((pick, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <span className="font-semibold text-slate-300">Highlight #{i + 1}</span>
                              <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded text-[11px] border border-cyan-800/40">
                                {formatTime(pick.start)} → {formatTime(pick.end)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Applied: <code className="text-indigo-400">fl_splice / l_video / start_offset / end_offset</code>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Smart Chapters & Clipped Assets Grid */}
                {data.clips && data.clips.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-cyan-400" />
                          <span>📑 Smart Chapters & Clipped Video Assets</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Each chapter is cropped into a standalone Cloudinary video asset with structured metadata indexed for search.
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                        {data.clips.length} Clips Indexed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.clips.map((clip, index) => (
                        <div
                          key={clip.id || index}
                          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group shadow-lg"
                        >
                          {/* Thumbnail with overlay duration */}
                          <div className="relative aspect-video bg-black overflow-hidden">
                            <img
                              src={clip.thumb}
                              alt={clip.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <span className="absolute bottom-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 text-cyan-300 border border-slate-700 backdrop-blur-sm">
                              {formatTime(clip.start)} - {formatTime(clip.end)}
                            </span>

                            <button
                              onClick={() => seekTo(clip.start)}
                              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-cyan-500/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 shadow-lg cursor-pointer"
                              title="Play in main player"
                            >
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </button>
                          </div>

                          {/* Details */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition line-clamp-1">
                                {clip.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {clip.summary}
                              </p>
                            </div>

                            {clip.tags && clip.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {clip.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] font-medium bg-slate-950 text-cyan-400 px-2 py-0.5 rounded-md border border-slate-800"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <button
                                onClick={() => seekTo(clip.start)}
                                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
                              >
                                <Play className="w-3 h-3" />
                                <span>Seek</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyToClipboard(clip.url, `clip_${index}`)}
                                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                  title="Copy clip URL"
                                >
                                  {copiedKey === `clip_${index}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <a
                                  href={clip.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-white p-1 rounded"
                                  title="Open Cloudinary trimmed MP4"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: INDEXED CLIP LIBRARY & SEARCH ================= */}
        {activeTab === "library" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-cyan-400" />
                    <span>Cloudinary Video & Clip Search Engine</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Query the Cloudinary Search API across tagged video assets, topic names, and AI summaries.
                  </p>
                </div>
                <button
                  onClick={() => searchLibrary("")}
                  disabled={libraryLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${libraryLoading ? "animate-spin text-cyan-400" : ""}`} />
                  <span>Refresh Index</span>
                </button>
              </div>

              {/* Search Form */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchLibrary()}
                    placeholder="Search by topic, tag, keyword (e.g. speech, lecture, highlight)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <button
                  onClick={() => searchLibrary()}
                  disabled={libraryLoading}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition active:scale-95"
                >
                  Search
                </button>
              </div>

              {/* Quick Filter Tags */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-slate-400 text-[11px]">Quick filters:</span>
                {["echochapters", "highlight", "speech", "dance", "demo"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setLibraryQuery(tag);
                      searchLibrary(tag);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition text-[11px]"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results Grid */}
            {libraryLoading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <p className="text-xs">Searching Cloudinary media index...</p>
              </div>
            ) : libraryResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {libraryResults.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl overflow-hidden transition-all flex flex-col group shadow-lg"
                  >
                    <div
                      onClick={() => setPreviewModalItem(item)}
                      className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                    >
                      <img
                        src={item.thumb}
                        alt={item.topic}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <h4 className="font-bold text-xs text-white group-hover:text-cyan-400 transition truncate">
                          {item.topic}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {item.summary}
                        </p>
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[9px] bg-slate-950 text-cyan-400 px-1.5 py-0.5 rounded border border-slate-800">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => setPreviewModalItem(item)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 text-slate-400" />
                <p className="text-sm font-medium">No clips found in index</p>
                <p className="text-xs text-slate-400">Try running the Studio pipeline to generate and index video chapters.</p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ARCHITECTURE & SYSTEM DESIGN ================= */}
        {activeTab === "architecture" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
                  Technical Architecture
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  EchoChapters Pipeline Architecture
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  How Cloudinary Media Execution and Google Gemini Content Reasoning seamlessly integrate.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cloudinary Box */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <h3 className="text-base font-bold text-blue-400">Cloudinary Media Execution</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Fast Streaming Uploads:</strong> Backend direct upload & unsigned presets.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Smart Clip Trimming:</strong> <code>start_offset</code> and <code>end_offset</code> lossless video slicing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Dynamic Video Splicing:</strong> <code>fl_splice</code> and <code>l_video</code> to render promo reels on the fly.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>AI Thumbnail Extraction:</strong> <code>start_offset: "auto"</code> keyframe selection.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Search & Metadata API:</strong> Structured context topic/summary indexing.</span>
                    </li>
                  </ul>
                </div>

                {/* Gemini Box */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <h3 className="text-base font-bold text-cyan-400">Google Gemini Content Intelligence</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>Speech-to-Text Transcription:</strong> Fast multimodal audio decoding with millisecond timestamps.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>Semantic Chaptering:</strong> Analyzes topic flow to segment long lectures into structured units.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>Highlight Selection:</strong> Picks the most punchy dialogue segments for the promotional teaser.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>Multilingual Translation:</strong> Produces accurate WebVTT subtitle tracks across 8+ world languages.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step by step flow */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  End-to-End Execution Flow:
                </span>
                <p className="font-mono text-[11px] text-cyan-300">
                  Upload → Cloudinary Ingestion → Gemini Audio STT → Gemini Chapter & Highlight Reasoning → Cloudinary Clip Cropping + Metadata Tagging → Cloudinary Dynamic Reel Splicing → Cloudinary Search API Indexing
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Preview Modal for Library Items */}
      {previewModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white truncate max-w-[400px]">
                {previewModalItem.topic}
              </h3>
              <button
                onClick={() => setPreviewModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
              <video controls autoPlay className="w-full h-full object-contain" src={previewModalItem.url} />
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">{previewModalItem.summary}</p>
              <div className="flex items-center justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                <span>Public ID: <code className="text-cyan-400">{previewModalItem.id}</code></span>
                <a
                  href={previewModalItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Open in Cloudinary CDN</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EchoChapters — Track 3 Hackathon Entry</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Cloudinary Media Engine</span>
            <span>•</span>
            <span>Google Gemini 2.5 Flash</span>
            <span>•</span>
            <span>Next.js Turbopack</span>
          </div>
        </div>
      </footer>
    </div>
  );
}