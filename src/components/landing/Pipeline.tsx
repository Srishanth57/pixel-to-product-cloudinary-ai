import { AudioLines, ListTree, Scissors, Clapperboard, Languages } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

/* Bento math (6 cols, grid-flow-dense): row1 = 4+2, row2 = (4 continues)+2, row3 = 3+3. Five cells, zero voids. */
const cells = [
  { icon: AudioLines, t: "Transcription that never fails silently", d: "Cloudinary speech-to-text runs first. If it returns nothing, Gemini 2.5 Flash transcribes the audio into timestamped segments.", cls: "md:col-span-4 md:row-span-2", img: "mountain-sensor-array" },
  { icon: ListTree, t: "Two to six chapters", d: "Gemini reads the transcript and returns titles, summaries and tags.", cls: "md:col-span-2" },
  { icon: Scissors, t: "Clips that carry metadata", d: "Each chapter is cropped into its own asset, tagged and searchable.", cls: "md:col-span-2" },
  { icon: Clapperboard, t: "A highlight reel", d: "Two to four moments of 5 to 12 seconds, spliced into one short video.", cls: "md:col-span-3" },
  { icon: Languages, t: "Subtitles in any language", d: "Translated segment by segment and delivered as WebVTT.", cls: "md:col-span-3" },
];

export default function Pipeline() {
  return (
    <section id="pipeline" className="mx-auto max-w-7xl px-6 py-32 md:py-48">
      <Reveal><h2 className="display max-w-4xl text-[clamp(2rem,4.5vw,4rem)]">One upload, five finished outputs</h2></Reveal>
      <div className="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-6">
        {cells.map(({ icon: Icon, t, d, cls, img }, n) => (
          <Reveal key={t} i={n} className={`group relative overflow-hidden rounded-xl border border-line bg-surface p-8 ${cls}`}>
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://picsum.photos/seed/${img}/1200/900`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 grayscale transition-transform duration-700 group-hover:scale-105" />
            )}
            <div className="relative flex h-full min-h-48 flex-col justify-between gap-12">
              <Icon className="size-6 text-moss" strokeWidth={1.5} />
              <div><h3 className="text-xl font-light tracking-tight">{t}</h3><p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{d}</p></div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}