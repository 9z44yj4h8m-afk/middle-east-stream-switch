import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ListVideo, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bedouinSeries, type BedouinEpisode } from "@/lib/bedouin-series";

export const Route = createFileRoute("/bedouin-drama")({
  head: () => ({ meta: [
    { title: "البدوية دراما — المسلسلات البدوية | المغني لايف" },
    { name: "description", content: "شاهد النذير وذياب هباب الريح وأخو سعدى وغدر الزمان والقصير ودواس الليل وعودة أبو تايه، مع صور الحلقات المرتبة ومشغّل يوتيوب داخل الموقع." },
    { property: "og:title", content: "البدوية دراما — المغني لايف" },
    { property: "og:description", content: "سبعة مسلسلات بدوية في المغني لايف، مع الحلقات المتاحة بصورها وترتيبها ومشاهدتها داخل الموقع." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BedouinDramaPage,
});

function BedouinDramaPage() {
  const [opened, setOpened] = useState<string | null>(null);
  const [playing, setPlaying] = useState<BedouinEpisode | null>(bedouinSeries[0]?.episodes[0] ?? null);
  const [query, setQuery] = useState("");
  const series = bedouinSeries.find((s) => s.id === opened);
  const episodes = series ? [...series.episodes].sort((a, b) => a.number - b.number) : [];
  const missingNumbers = series ? Array.from({ length: series.expectedEpisodeCount }, (_, i) => i + 1).filter((number) => !episodes.some((e) => e.number === number)) : [];
  const index = episodes.findIndex((e) => e.youtubeId === playing?.youtubeId);
  function watch(episode: BedouinEpisode) {
    setPlaying(episode);
    requestAnimationFrame(() => document.getElementById("bedouin-player")?.scrollIntoView({ behavior: "auto", block: "start" }));
  }
  return <main dir="rtl" className="mx-auto min-h-[70vh] max-w-6xl px-3 pb-28 pt-6 sm:px-6">
    <div className="mb-6 flex items-center gap-3">
      <Button variant="outline" size="icon" aria-label={opened ? "رجوع إلى المسلسلات" : "رجوع إلى الرئيسية"} asChild={!opened} onClick={opened ? () => { setOpened(null); setQuery(""); } : undefined}>
        {opened ? <ArrowRight className="h-5 w-5" /> : <Link to="/"><ArrowRight className="h-5 w-5" /></Link>}
      </Button>
      <div className="min-w-0"><h1 className="font-display text-2xl font-black sm:text-3xl">البدوية دراما</h1>{series && <p className="mt-1 font-bold text-muted-foreground">{series.title} · {episodes.length} حلقة متاحة</p>}</div>
    </div>
    {playing && <section id="bedouin-player" aria-label="مشغل الحلقات" className="mb-6 scroll-mt-24">
      <div className="broadcast-screen design-gleam aspect-video"><iframe key={playing.youtubeId} src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`} title={playing.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full" /></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 text-lg font-bold">{series?.title ?? playing.title} · الحلقة {playing.number}</h2>{series && <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="الحلقة السابقة" disabled={index <= 0} onClick={() => { const e = episodes[index - 1]; if (e) watch(e); }}><ChevronRight /></Button><Button variant="outline" size="icon" aria-label="الحلقة التالية" disabled={index >= episodes.length - 1} onClick={() => { const e = episodes[index + 1]; if (e) watch(e); }}><ChevronLeft /></Button></div>}</div>
    </section>}
    <label className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-surface-deep px-4 py-3"><Search className="h-5 w-5 shrink-0 text-sky" /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label={series ? "ابحث عن حلقة" : "ابحث عن مسلسل"} placeholder={series ? "ابحث عن حلقة…" : "ابحث عن مسلسل…"} className="min-w-0 flex-1 bg-transparent outline-none" /></label>
    {!series && <section aria-label="المسلسلات البدوية" className="grid gap-4 md:grid-cols-2">
      {bedouinSeries.filter((s) => s.title.includes(query.trim())).map((s) => {
        const cover = s.episodes.find((e) => e.number === 1) ?? s.episodes[0];
        return <Button key={s.id} variant="ghost" onClick={() => { setOpened(s.id); setPlaying(s.episodes[0] ?? null); setQuery(""); }} aria-label={`عرض حلقات ${s.title}`} className="group block h-auto w-full overflow-hidden whitespace-normal rounded-lg border border-sky/50 bg-surface-deep p-0 text-right hover:border-sky">
          {s.coverImage ? <span className="block aspect-[1920/712]"><img src={s.coverImage} alt={s.title} width={1920} height={712} loading="lazy" decoding="async" className="h-full w-full object-contain" /></span> : <span className="relative block aspect-video"><img src={cover?.image} alt={s.title} width={480} height={360} className="h-full w-full object-cover" /><span className="absolute inset-0 bg-player-overlay" /><span className="absolute bottom-4 right-4 left-4 flex items-center justify-between gap-3"><span className="font-display text-2xl font-black text-foreground">{s.title}</span><Play className="h-8 w-8 shrink-0 fill-current text-primary" /></span></span>}
          <span className="flex items-center justify-between gap-2 p-4"><span className="flex items-center gap-2 text-sm font-bold"><ListVideo className="h-4 w-4 text-sky" />{s.episodes.length} حلقة متاحة</span><span className="text-sm font-bold text-sky">جميع الحلقات <ChevronLeft className="inline h-4 w-4" /></span></span>
        </Button>;
      })}
      {!bedouinSeries.some((s) => s.title.includes(query.trim())) && <p className="py-8 text-muted-foreground">لا توجد مسلسلات مطابقة.</p>}
    </section>}
    {series && <>
      {missingNumbers.length > 0 && <p className="mb-5 border-r-2 border-primary pr-3 text-sm text-muted-foreground">لم يتوفر رابط موثّق للحلقات: {missingNumbers.join("، ")}.</p>}
      <section aria-label={`حلقات ${series.title}`} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {episodes.filter((e) => `${e.title} ${e.number}`.includes(query.trim())).map((e) => <Button key={e.youtubeId} variant="ghost" aria-label={`شاهد الحلقة ${e.number}`} aria-pressed={e.youtubeId === playing?.youtubeId} onClick={() => watch(e)} className={`block h-auto w-full overflow-hidden whitespace-normal rounded-lg border bg-surface-deep p-0 text-right hover:border-sky ${e.youtubeId === playing?.youtubeId ? "border-primary" : "border-border"}`}>
          <span className="relative block aspect-video"><img src={e.image} alt={`${series.title} — الحلقة ${e.number}`} width={480} height={360} loading="lazy" decoding="async" className="h-full w-full object-cover" /><span className="absolute inset-0 bg-player-overlay" /><span className="absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><Play className="h-4 w-4 fill-current" /></span></span>
          <span className="block p-3"><span className="block text-sm font-black sm:text-base">الحلقة {e.number}</span><span className="mt-1 block text-xs text-muted-foreground">{e.youtubeId === playing?.youtubeId ? "يُعرض الآن" : series.title}</span></span>
        </Button>)}
        {!episodes.some((e) => `${e.title} ${e.number}`.includes(query.trim())) && <p className="col-span-full py-8 text-muted-foreground">لا توجد حلقات مطابقة.</p>}
      </section>
    </>}
  </main>;
}