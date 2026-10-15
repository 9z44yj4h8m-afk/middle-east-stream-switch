import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Play, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFeaturedChannels } from "@/lib/featured-channel.functions";
import satelliteWorld from "@/assets/satellite-world.jpg";

export const Route = createFileRoute("/featured/")({
  loader: () => getFeaturedChannels(),
  head: () => ({
    meta: [
      { title: "القنوات المميزة — المغني لايف" },
      { name: "description", content: "قسم القنوات المميزة في almoghani smarter: beIN SPORTS وSSC وأبوظبي الرياضية والكأس ونتفليكس وشاهد." },
      { property: "og:title", content: "القنوات المميزة — المغني لايف" },
      { property: "og:description", content: "اختر قناة مميزة، شاهد تفاصيلها، ثم تابعها داخل المكتبة الخاصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturedIndex,
});

function FeaturedIndex() {
  const items = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <header className="border-b border-border bg-surface-deep/80 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-foreground">
            <ArrowRight className="h-5 w-5 text-sky" />
            رجوع للرئيسية
          </Link>
          <span dir="ltr" className="font-display text-lg font-black text-sky">
            almoghani smarter
          </span>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={satelliteWorld}
          width={1536}
          height={1024}
          alt="دش ورسيفر وأقمار صناعية وتلفزيونات"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--background),color-mix(in_oklab,var(--background)_55%,transparent))]" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-black text-accent">almoghani.net</p>
          <h1 className="mt-3 font-display text-3xl font-black sm:text-5xl">القنوات المميزة</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-foreground/80">
            اختر قناة لمشاهدة تفاصيلها، ثم تابعها داخل المكتبة الخاصة.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/vip" search={{ kind: "live" }}>
              <Tv className="h-5 w-5" />
              دخول المكتبة الخاصة
            </Link>
          </Button>
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Lock className="h-4 w-4" />
            دخول عضو ورمز المكتبة مطلوبان
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((tile) => (
            <Link
              key={tile.id}
              to="/featured/$channel"
              params={{ channel: tile.id }}
              className="featured-grid-card group"
            >
              <span className="relative block aspect-video overflow-hidden bg-vip-background">
                {tile.logo ? (
                  <img
                    src={tile.logo}
                    alt={`شعار ${tile.name}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full bg-white/95 object-contain p-6"
                  />
                ) : (
                  <img
                    src={satelliteWorld}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-player-overlay" />
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[10px] font-black text-live-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-live-foreground animate-live-pulse" />
                  {tile.category}
                </span>
                <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-vip-cyan text-vip-background">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </span>
              <span className="block p-4">
                <span className="block truncate font-display text-lg font-black">{tile.name}</span>
                <span className="mt-1 block text-xs font-semibold leading-6 text-vip-foreground/65">
                  {tile.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
