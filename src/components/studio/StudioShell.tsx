"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProcessResult } from "@/lib/types";
import UploadPanel from "./UploadPanel";
import ResultsView from "./ResultsView";
import SearchPanel from "./SearchPanel";

export default function StudioShell() {
  const [data, setData] = useState<ProcessResult | null>(null);
  const [tab, setTab] = useState<"process" | "library">("process");
  const tabCls = (t: string) => `rounded-lg px-4 py-2 text-sm ${tab === t ? "bg-raised text-mist" : "text-muted hover:text-mist"}`;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-light">Echo<span className="text-moss">Chapters</span></Link>
        <div className="flex gap-1"><button className={tabCls("process")} onClick={() => setTab("process")}>Process</button><button className={tabCls("library")} onClick={() => setTab("library")}>Library</button></div>
      </header>
      {tab === "library" ? <SearchPanel /> : data ? <ResultsView data={data} /> : <UploadPanel onDone={setData} />}
    </div>
  );
}