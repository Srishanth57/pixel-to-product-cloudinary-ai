import Link from "next/link";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-light tracking-tight">Echo<span className="text-moss">Chapters</span></Link>
        <div className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#pipeline" className="hover:text-mist">Pipeline</a>
          <a href="#platform" className="hover:text-mist">Platform</a>
          <a href="#start" className="hover:text-mist">Start</a>
        </div>
        <Link href="/studio" className="btn btn-primary">Open studio</Link>
      </nav>
    </header>
  );
}