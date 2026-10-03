import Link from "next/link";
import Reveal from "@/components/ui/Reveal";

export default function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-end overflow-hidden pb-24 pt-32">
      {/* TODO: replace with real footage still, 1920x1080 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://picsum.photos/seed/forest-canopy-lecture/1920/1080" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 grayscale contrast-125" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(12,17,14,.55),var(--color-canvas)_75%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <Reveal>
          <h1 className="display max-w-5xl text-[clamp(2.75rem,6vw,5.5rem)]">Where hours of video become searchable knowledge</h1>
        </Reveal>
        <Reveal i={1}>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-mist/75">Upload a lecture. Get chapters, clips, a highlight reel and subtitles in any language.</p>
        </Reveal>
        <Reveal i={2} className="mt-10 flex flex-wrap gap-3">
          <Link href="/studio" className="btn btn-primary">Open studio</Link>
          <a href="#pipeline" className="btn btn-ghost">See the pipeline</a>
        </Reveal>
      </div>
    </section>
  );
}