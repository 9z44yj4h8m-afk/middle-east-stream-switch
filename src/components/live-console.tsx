import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Play } from "lucide-react";
import { useCatalog } from "@/lib/site-config";
import { LivePlayer } from "@/components/live-player";
import type { Channel } from "@/lib/channels";

const BADGE_COLORS = ["bg-console-red", "bg-console-blue", "bg-console-teal", "bg-console-violet", "bg-console-slate"];

function Badge({ name, index, big }: { name: string; index: number; big?: boolean }) {
  return (
    <span
      className={`${BADGE_COLORS[index % BADGE_COLORS.length]} grid shrink-0 place-items-center rounded-md font-bold text-foreground ${big ? "h-11 w-11 text-xl" : "h-8 w-8 text-sm"}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function LiveConsole() {
  const catalog = useCatalog();
  const list = useMemo(() => catalog.filter((c) => c.streamUrl || c.youtubeId || c.youtubeChannelId), [catalog]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState<Channel | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const current = list[index] ?? list[0];
  if (!current) return null;

  const go = (step: number) => {
    const next = (index + step + list.length) % list.length;
    setIndex(next);
    if (playing) setPlaying(list[next]);
  };

  return (
    <div dir="ltr" className="min-h-screen bg-console-bg p-4 text-foreground sm:p-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <h1 className="text-4xl font-black tracking-tight text-console-red sm:text-5xl">ALMOGHANI LIVE</h1>
          <p className="mt-2 text-console-green">Couch Potato Edition</p>
          <p className="mt-2 text-xs text-console-red">↑↓ Navigate · [Select] Play · ← Fullscreen</p>
          <div dir="rtl" className="mt-4 grid grid-cols-3 gap-3">
            <span className="rounded-md bg-console-green py-1.5 text-center text-sm font-bold text-console-bg">البث المباشر</span>
            <Link to="/movies" className="flex items-center justify-center gap-1 rounded-md border border-console-green py-1.5 text-sm font-bold text-console-red">
              الافلام <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <Link to="/bedouin-drama" className="flex items-center justify-center gap-1 rounded-md border border-console-green py-1.5 text-sm font-bold text-console-red">
              مسلسلات <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-5 max-h-[70vh] space-y-2.5 overflow-y-auto pe-1">
            {list.map((c, i) => {
              const active = i === index;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setIndex(i);
                      setPlaying(c);
                      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-start transition ${active ? "border-console-green bg-console-green/15" : "border-console-line bg-console-card hover:border-console-green/60"}`}
                  >
                    <Badge name={c.name} index={i} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold leading-tight">{c.name}</span>
                      <span className="block truncate text-sm text-console-red">{c.category} • {c.description}</span>
                    </span>
                    {active && <Play className="h-5 w-5 shrink-0 fill-console-green text-console-green" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section ref={playerRef} className="h-fit rounded-xl border border-console-line bg-console-card p-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-lg bg-console-bg">
            {playing ? (
              <LivePlayer key={playing.id} channel={playing} />
            ) : (
              <img src={current.thumbnail} alt={current.name} className="aspect-video w-full object-cover" />
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Badge name={current.name} index={index} big />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{current.name}</p>
              <p className="truncate text-sm text-console-red">{current.category} • {current.description}</p>
            </div>
          </div>
          <div dir="rtl" className="mt-3 space-y-2.5">
            <button onClick={() => setPlaying(current)} className="flex w-full items-center justify-center gap-2 rounded-md bg-console-green py-2.5 text-lg font-bold text-console-bg">
              تشغيل الآن <Play className="h-4 w-4 fill-current" />
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => go(1)} className="flex items-center justify-center gap-2 rounded-md border border-console-line py-2 font-bold">
                <ChevronRight className="h-4 w-4" /> التالي
              </button>
              <button onClick={() => go(-1)} className="flex items-center justify-center gap-2 rounded-md border border-console-line py-2 font-bold">
                السابق <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => playerRef.current?.querySelector("video,iframe,div")?.requestFullscreen?.()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-console-line py-2 text-muted-foreground"
            >
              ملء الشاشة <Maximize className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
