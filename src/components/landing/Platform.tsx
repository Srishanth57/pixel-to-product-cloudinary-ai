import Reveal from "@/components/ui/Reveal";

const items = [
  ["Cloudinary", "Storage, trimming, thumbnails, splicing and delivery from one URL scheme."],
  ["Gemini 2.5 Flash", "Chaptering, highlight selection, translation and the transcription fallback."],
  ["Context search", "Topics, summaries and tags are written to each asset, so search needs no extra database."],
  ["Next.js 16", "Route handlers for upload, process, search and subtitles. Deploy anywhere Node runs."],
];

export default function Platform() {
  return (
    <section id="platform" className="bg-mist py-32 text-ink md:py-48">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-32">
            <h2 className="display text-[clamp(2rem,4vw,3.5rem)]">Built on infrastructure you already run</h2>
            <p className="mt-6 max-w-sm leading-relaxed text-ink/65">No new database, no queue to babysit. Every result lives as a Cloudinary asset.</p>
          </div>
        </div>
        <ul className="divide-y divide-ink/10 lg:col-span-3">
          {items.map(([t, d], n) => (
            <li key={t}><Reveal i={n} className="py-10"><h3 className="text-2xl font-light tracking-tight">{t}</h3><p className="mt-3 max-w-lg leading-relaxed text-ink/65">{d}</p></Reveal></li>
          ))}
        </ul>
      </div>
    </section>
  );
}