import Link from "next/link";

export default function CtaFooter() {
  return (
    <>
      <section id="start" className="relative overflow-hidden py-32 md:py-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/river-valley-aerial/1920/900" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="display text-[clamp(2.25rem,5vw,4.5rem)]">Turn every recording into a library</h2>
          <p className="mx-auto mt-6 max-w-md text-mist/70">Bring one video and see the full pipeline run.</p>
          <Link href="/studio" className="btn btn-primary mt-10">Open studio</Link>
        </div>
      </section>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-6 py-16 md:flex-row">
          <p className="text-lg font-light">Echo<span className="text-moss">Chapters</span></p>
          <div className="flex gap-16 text-sm text-muted">
            <ul className="space-y-3"><li><a href="#pipeline" className="hover:text-mist">Pipeline</a></li><li><a href="#platform" className="hover:text-mist">Platform</a></li></ul>
            <ul className="space-y-3"><li><Link href="/studio" className="hover:text-mist">Studio</Link></li></ul>
          </div>
        </div>
      </footer>
    </>
  );
}