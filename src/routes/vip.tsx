import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Clapperboard,
  Copy,
  Film,
  Lock,
  Play,
  Search,
  Tv,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberLibraryGate } from "@/components/member-library-gate";
import { getLibraryGroups, getLibraryTitles, searchLibrary } from "@/lib/iptv/library.functions";
import { SmartersCatalog } from "@/components/smarters-catalog";

export const Route = createFileRoute("/vip")({
  validateSearch: (search: Record<string, unknown>): { kind?: string | undefined; group?: string | undefined; q?: string | undefined } => ({ kind: typeof search["kind"] === "string" ? search["kind"] : undefined, group: typeof search["group"] === "string" ? search["group"] : undefined, q: typeof search["q"] === "string" ? search["q"] : undefined }),
  head: () => ({
    meta: [
      { title: "قنوات سمارتر — المغني لايف" },
      { name: "description", content: "تصفّح قنوات Almoghani Smarter pro وسجّل الدخول للمشاهدة." },
      { property: "og:title", content: "قنوات سمارتر — المغني لايف" },
      { property: "og:description", content: "قنوات سمارتر مرتبة حسب التصنيف؛ المشاهدة للأعضاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SmartersPage,
});

function SmartersPage() {
  const { kind } = Route.useSearch();
  const [watchGroup, setWatchGroup] = useState<string | null>(null);
  if (watchGroup !== null || kind === "movie" || kind === "series") return <MemberLibraryGate><VipPage initialGroup={watchGroup ?? undefined} onCatalog={() => setWatchGroup(null)} /></MemberLibraryGate>;
  return <SmartersCatalog onMemberWatch={setWatchGroup} />;
}

type Kind = "live" | "movie" | "series";
type Item = { name: string; group: string; logo: string; url: string };
type LibraryTitle = { name: string; count: number; logo: string };

const TABS: {
  k: Kind;
  label: string;
  eyebrow: string;
  Icon: typeof Tv;
  activeClass: string;
}[] = [
  { k: "live", label: "بث مباشر", eyebrow: "شاهد الآن", Icon: Tv, activeClass: "bg-live text-live-foreground" },
  { k: "movie", label: "الأفلام", eyebrow: "مكتبة الأفلام", Icon: Film, activeClass: "bg-primary text-primary-foreground" },
  { k: "series", label: "المسلسلات", eyebrow: "جميع الحلقات", Icon: Clapperboard, activeClass: "bg-accent text-accent-foreground" },
];

function VipPage({ initialGroup, onCatalog }: { initialGroup?: string | undefined; onCatalog: () => void }) {
  const pin = "member-session";
  const [fetchError, setFetchError] = useState("");
  const [kind, setKind] = useState<Kind>("live");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [groups, setGroups] = useState<{ name: string; count: number }[]>([]);
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [titles, setTitles] = useState<LibraryTitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState(initialGroup ?? "");
  const [total, setTotal] = useState(0);
  const [titleTotal, setTitleTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<Item | null>(null);
  const fetchGroups = useServerFn(getLibraryGroups);
  const fetchTitles = useServerFn(getLibraryTitles);
  const fetchItems = useServerFn(searchLibrary);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedKind = params.get("kind");
    if (requestedKind !== "live" && requestedKind !== "movie" && requestedKind !== "series") return;
    setKind(requestedKind);
    if (requestedKind === "movie") {
      setGroup(params.get("group") ?? "");
      setQ(params.get("q") ?? "");
    }
    if (requestedKind === "live" || requestedKind === "series") {
      setSelectedTitle(initialGroup ?? params.get("group") ?? "");
      setQ(params.get("q") ?? "");
    }
    setLibraryOpen(true);
  }, []);

  useEffect(() => {
    if (!pin) return;
    if (kind === "movie") {
      fetchGroups({ data: { pin, kind } }).then(setGroups).catch(() => setFetchError("تعذّر تحميل التصنيفات."));
    } else {
      setGroup("");
      setGroups([]);
    }
  }, [pin, kind]);

  useEffect(() => {
    if (!pin) return;
    if (kind !== "movie" && !selectedTitle) return;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await fetchItems({ data: { pin, kind, q, group: selectedTitle || group, page } });
        setItems((current) => (page === 0 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
      } catch {
        setFetchError("تعذّر تحميل المحتوى؛ أعد المحاولة.");
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pin, kind, q, group, selectedTitle, page]);

  useEffect(() => {
    if (!pin || kind === "movie" || selectedTitle) return;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await fetchTitles({ data: { pin, kind, q, page } });
        setTitles((current) => (page === 0 ? result.titles : [...current, ...result.titles]));
        setTitleTotal(result.total);
        setItems([]);
      } catch {
        setFetchError("تعذّر تحميل العناوين؛ أعد المحاولة.");
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pin, kind, q, selectedTitle, page]);

  useEffect(() => setPage(0), [kind, q, group, selectedTitle]);

  const activeTab = TABS.find((tab) => tab.k === kind) ?? TABS[0];
  if (!activeTab) return null;
  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => alert("تم نسخ الرابط"));
  const openLibrary = (nextKind: Kind) => {
    setKind(nextKind);
    setGroup("");
    setSelectedTitle("");
    setQ("");
    setLibraryOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-vip-background text-vip-foreground" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-vip-foreground/10 bg-vip-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 pb-4 pt-5 sm:px-6">
          <div className="flex items-center gap-3">
            {libraryOpen ? (
              <Button asChild variant="ghost" size="icon" className="border border-vip-foreground/15 text-vip-foreground hover:bg-vip-foreground/10" aria-label="العودة إلى قنوات سمارتر"><Link to="/vip" search={{ kind: "live" }} onClick={onCatalog}>
                <ArrowRight className="h-5 w-5" />
              </Link></Button>
            ) : (
              <Link to="/movies" className="grid h-9 w-9 place-items-center rounded-md border border-vip-foreground/15 text-vip-foreground" aria-label="رجوع إلى الأفلام">
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-vip-purple text-vip-foreground shadow-lg shadow-vip-purple/25">
              <Tv className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-vip-cyan">ALMOGHANI LIVE</p>
              <h1 className="truncate text-xl font-black">{libraryOpen ? activeTab.label : "Almoghani Smarter pro"}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl overflow-hidden px-4 py-6 sm:px-6">
        {fetchError && <p role="alert" className="mb-4 text-sm text-destructive">{fetchError}</p>}
        {!libraryOpen ? (
        <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center pb-16" aria-label="أقسام المكتبة">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold text-vip-cyan">اختر نوع المحتوى</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">ماذا تريد أن تشاهد؟</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
          {TABS.map(({ k, label, eyebrow, Icon, activeClass }, index) => {
            const tileClass = k === "live"
              ? "bg-vip-cyan"
              : k === "movie"
                ? "bg-vip-purple"
                : "bg-[linear-gradient(145deg,var(--vip-purple),var(--vip-cyan))]";
            return (
              <Button
                key={k}
                type="button"
                onClick={() => openLibrary(k)}
                className={`group relative h-40 w-full overflow-hidden border-0 p-5 text-vip-foreground shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98] sm:h-52 ${tileClass}`}
              >
                <span className="absolute -bottom-8 -left-5 h-32 w-32 rounded-full bg-vip-foreground/10" />
                <span className="relative flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-vip-foreground/18 shadow-inner sm:h-20 sm:w-20">
                    <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
                  </span>
                  <span>
                    <span className="block text-xl font-black sm:text-2xl">{label}</span>
                    <span className="mt-1 block text-xs font-bold opacity-80">{eyebrow}</span>
                  </span>
                </span>
              </Button>
            );
          })}
          </div>
          <a href="https://almoghani.net" className="mt-8 text-center text-xs font-bold text-vip-foreground/45" dir="ltr">almoghani.net</a>
        </section>
        ) : (
        <>

        <section className="mt-6 min-w-0 overflow-hidden" aria-label="البحث والتصنيف">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {selectedTitle && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTitle("");
                    setQ("");
                  }}
                  className="shrink-0 border border-vip-foreground/15 text-vip-foreground hover:bg-vip-foreground/10"
                  aria-label="العودة إلى العناوين"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
              <div className="min-w-0">
              <p className="text-xs font-bold text-vip-cyan">تصفّح الآن</p>
              <h2 className="truncate text-lg font-black">{selectedTitle || activeTab.label}</h2>
              </div>
            </div>
            <span className="rounded-md border border-vip-foreground/10 bg-vip-surface px-2.5 py-1 text-xs font-bold text-vip-foreground/60">
              {busy && page === 0
                ? "جارٍ التحميل…"
                : `${(kind !== "movie" && !selectedTitle ? titleTotal : total).toLocaleString("ar")} ${kind === "series" && !selectedTitle ? "مسلسل" : kind === "live" && !selectedTitle ? "عنوان" : "عنصر"}`}
            </span>
          </div>

          <div className={`mt-3 grid gap-2 ${kind === "movie" ? "sm:grid-cols-[1fr_15rem]" : ""}`}>
            <label className="relative block">
              <span className="sr-only">ابحث في المكتبة</span>
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={kind === "series" && !selectedTitle ? "ابحث عن مسلسل…" : kind === "live" && !selectedTitle ? "ابحث عن عنوان بث…" : "ابحث بالاسم…"}
                className="h-11 w-full rounded-lg border border-vip-foreground/10 bg-vip-surface pe-3 ps-10 text-sm text-vip-foreground outline-none transition-colors placeholder:text-vip-foreground/40 focus:border-vip-cyan focus:ring-2 focus:ring-vip-cyan/20"
              />
            </label>
            {kind === "movie" && <label>
              <span className="sr-only">اختر التصنيف</span>
              <select
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                className="h-11 w-full rounded-lg border border-vip-foreground/10 bg-vip-surface px-3 text-sm font-bold text-vip-foreground outline-none focus:border-vip-cyan focus:ring-2 focus:ring-vip-cyan/20"
              >
                <option value="">كل التصنيفات</option>
                {groups.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name} ({entry.count.toLocaleString("ar")})
                  </option>
                ))}
              </select>
            </label>}
          </div>

          {kind === "movie" && <div className="no-scrollbar mt-3 flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setGroup("")}
              className={`shrink-0 border-vip-foreground/10 text-vip-foreground ${group === "" ? "bg-vip-purple" : "bg-vip-surface hover:bg-vip-foreground/10"}`}
            >
              الكل
            </Button>
            {groups.slice(0, 8).map((entry) => (
              <Button
                key={entry.name}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setGroup(entry.name)}
                className={`max-w-52 shrink-0 overflow-hidden text-ellipsis border-vip-foreground/10 text-vip-foreground ${group === entry.name ? "bg-vip-purple" : "bg-vip-surface hover:bg-vip-foreground/10"}`}
              >
                {entry.name}
              </Button>
            ))}
          </div>}
        </section>

        {kind !== "movie" && !selectedTitle ? (
        <ul className="mt-5 grid gap-2 lg:grid-cols-2">
          {titles.map((entry) => (
            <li key={entry.name}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedTitle(entry.name);
                  setQ("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group h-auto w-full min-w-0 justify-start gap-3 overflow-hidden border border-vip-foreground/10 bg-vip-surface p-3 text-right text-vip-foreground hover:border-vip-cyan hover:bg-vip-foreground/10"
              >
                <span className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-vip-background/70">
                  {entry.logo ? (
                    <img src={entry.logo} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={(event) => { event.currentTarget.hidden = true; }} />
                  ) : (
                    <activeTab.Icon className="h-6 w-6 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{entry.name}</span>
                  <span className="block text-xs text-vip-foreground/50">
                    {entry.count.toLocaleString("ar")} {kind === "series" ? "حلقة" : "قناة"}
                  </span>
                </span>
                <ChevronLeft className="h-5 w-5 shrink-0 text-vip-cyan" />
              </Button>
            </li>
          ))}
        </ul>
        ) : (
        <ul className="mt-5 grid gap-2 lg:grid-cols-2">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPlaying(item)}
                className="group h-auto w-full min-w-0 justify-start gap-3 overflow-hidden border border-vip-foreground/10 bg-vip-surface p-3 text-right text-vip-foreground hover:border-vip-cyan hover:bg-vip-foreground/10"
              >
                <span className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-vip-background/70">
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain p-1"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  ) : (
                    <activeTab.Icon className="h-6 w-6 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{item.name}</span>
                  <span className="block truncate text-xs text-vip-foreground/50">{item.group}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-vip-cyan text-vip-background transition-transform group-hover:scale-105">
                  <Play className="h-4 w-4" />
                </span>
              </Button>
            </li>
          ))}
        </ul>
        )}

        {!busy && (kind !== "movie" && !selectedTitle ? titles.length === 0 : items.length === 0) && (
          <div className="mt-5 border border-dashed border-vip-foreground/15 bg-vip-surface p-8 text-center text-sm text-vip-foreground/55">
            لا توجد نتائج مطابقة.
          </div>
        )}

        {(kind !== "movie" && !selectedTitle ? titles.length < titleTotal : items.length < total) && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => setPage((current) => current + 1)} className="mx-auto mt-5 flex border-vip-foreground/15 bg-vip-surface text-vip-foreground hover:bg-vip-foreground/10">
            {busy ? "جارٍ التحميل…" : "عرض المزيد"}
          </Button>
        )}
        </>
        )}
      </main>

      {playing && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-background/85 backdrop-blur-sm sm:place-items-center" onClick={() => setPlaying(null)}>
          <section className="w-full max-w-md rounded-t-lg border border-border bg-card p-5 shadow-2xl sm:rounded-lg" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label={playing.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent">جاهز للمشاهدة</p>
                <h2 className="truncate text-lg font-black">{playing.name}</h2>
                <p className="truncate text-xs text-muted-foreground">{playing.group}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setPlaying(null)} aria-label="إغلاق">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <a href="https://almoghani.net" className="mt-3 flex items-center gap-1 text-xs font-bold text-primary" dir="ltr">
              almoghani.net <ChevronLeft className="h-3 w-3" />
            </a>
            <div className="mt-5 grid gap-2">
              <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-6 text-muted-foreground">سيرفر المزوّد يمنع التشغيل داخل المتصفح، شغّل الفيلم أو القناة في تطبيق VLC (أندرويد وآيفون) أو Outplayer (آيفون).</p>
              <Button type="button" size="lg" className="h-12 w-full" onClick={() => {
                const u = playing.url;
                window.location.href = /android/i.test(navigator.userAgent)
                  ? `intent:${u}#Intent;package=org.videolan.vlc;type=video/*;S.title=${encodeURIComponent(playing.name)};end`
                  : `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(u)}`;
              }}>
                <Play className="h-4 w-4" /> تشغيل في VLC
              </Button>
              <Button type="button" variant="outline" size="lg" className="h-12 w-full" onClick={() => { window.location.href = `outplayer://${playing.url}`; }}>
                <Play className="h-4 w-4" /> تشغيل في Outplayer (آيفون)
              </Button>
              <Button type="button" variant="ghost" size="lg" className="h-12 w-full" onClick={() => copy(playing.url)}>
                <Copy className="h-4 w-4" /> نسخ رابط البث
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}