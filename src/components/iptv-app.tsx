import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Crown, Tv, Film, Clapperboard, Heart, Search, Settings, ChevronLeft, ChevronRight, Play, X, LockKeyhole, Download, House, Radio, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LivePlayer } from "@/components/live-player";
import { useCatalog, useSiteConfig, applyMovieConfig, channelCategories } from "@/lib/site-config";
import { movies as baseMovies, type Movie } from "@/lib/movies";
import { bedouinSeries, type BedouinSeries, type BedouinEpisode } from "@/lib/bedouin-series";
import { publicIptvChannels, favoriteCatalog, type IptvView } from "@/lib/iptv-app";

const views = [{ id: "live", label: "البث المباشر", icon: Tv }, { id: "movies", label: "الأفلام", icon: Film }, { id: "series", label: "المسلسلات", icon: Clapperboard }, { id: "favorites", label: "المفضلة", icon: Heart }] as const;
type Playing = { youtubeId: string; title: string; subtitle: string };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function IptvApp({ view }: { view: IptvView }) {
  const catalog = publicIptvChannels(useCatalog());
  const { data: config } = useSiteConfig();
  const movies = applyMovieConfig(baseMovies, config);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [language, setLanguage] = useState("الكل");
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [opened, setOpened] = useState<BedouinSeries | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const player = useRef<HTMLElement>(null);
  const current = catalog.find((c) => c.id === selected) ?? catalog.find((c) => c.id === "mbc-1") ?? catalog[0];
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("almoghani-iptv-favorites") ?? "[]"); if (Array.isArray(saved)) setFavorites(saved.filter((s): s is string => typeof s === "string")); } catch { /* optional storage */ }
    const listener = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  function changeView(next: IptvView) { setQuery(""); setOpened(null); setPlaying(null); setSelected(null); setCategory("الكل"); void navigate({ to: "/iptv", search: { view: next } }); }
  function toggle(id: string) { setFavorites((old) => { const next = old.includes(id) ? old.filter((s) => s !== id) : [...old, id]; try { localStorage.setItem("almoghani-iptv-favorites", JSON.stringify(next)); } catch { /* optional storage */ } return next; }); }
  function scrollPlayer() { requestAnimationFrame(() => player.current?.scrollIntoView({ block: "start", behavior: "auto" })); }
  function watchMovie(m: Movie) { setPlaying({ youtubeId: m.youtubeId, title: m.title, subtitle: `${m.lang} · ${m.duration}` }); scrollPlayer(); }
  function watchEpisode(e: BedouinEpisode, s: BedouinSeries) { setPlaying({ youtubeId: e.youtubeId, title: `${s.title} — الحلقة ${e.number}`, subtitle: "البدوية دراما" }); scrollPlayer(); }
  const favorite = favoriteCatalog(catalog, movies, bedouinSeries, favorites);
  const matches = (title: string) => title.toLowerCase().includes(query.trim().toLowerCase());
  const channels = (view === "favorites" ? favorite.channels : catalog).filter((c) => matches(`${c.name} ${c.description}`) && (category === "الكل" || c.category === category));
  const movieList = (view === "favorites" ? favorite.movies : movies).filter((m) => matches(m.title) && (language === "الكل" || language === m.lang));
  const seriesList = (view === "favorites" ? favorite.series : bedouinSeries).filter((s) => matches(s.title));
  const episodes = opened ? [...opened.episodes].sort((a, b) => a.number - b.number) : [];
  const episodeIndex = episodes.findIndex((e) => e.youtubeId === playing?.youtubeId);
  const title = views.find((v) => v.id === view)?.label ?? "البث المباشر";
  const count = view === "live" ? channels.length : view === "movies" ? movieList.length : view === "series" ? (opened ? episodes.length : seriesList.length) : favorite.channels.length + favorite.movies.length + favorite.series.length;
  const heart = (id: string, label: string) => <Button size="icon" variant="ghost" className={`iptv-heart ${favorites.includes(id) ? "saved" : ""}`} aria-label={`${favorites.includes(id) ? "إزالة" : "إضافة"} ${label} ${favorites.includes(id) ? "من" : "إلى"} المفضلة`} aria-pressed={favorites.includes(id)} title="المفضلة" onClick={() => toggle(id)}><Heart className={favorites.includes(id) ? "fill-current" : ""} /></Button>;
  const channelGrid = <div className="iptv-channel-grid">{channels.map((c) => <article className={`iptv-channel ${c.id === current?.id ? "selected" : ""}`} key={c.id}>{heart(`live:${c.id}`, c.name)}<Button variant="ghost" aria-label={`تشغيل ${c.name}`} aria-pressed={c.id === current?.id} className="iptv-channel-play" onClick={() => { setSelected(c.id); setPlaying(null); scrollPlayer(); }}>{c.thumbnail ? <img src={c.thumbnail} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /> : <Tv />}<strong>{c.name}</strong><small>{c.category}</small><span className="iptv-live-label"><Radio />مباشر</span></Button></article>)}</div>;
  const movieGrid = <div className="iptv-movie-grid">{movieList.map((m) => <article className="iptv-movie" key={m.id}>{heart(`movie:${m.id}`,m.title)}<Button variant="ghost" className="iptv-movie-play" aria-label={`شاهد ${m.title}`} onClick={() => watchMovie(m)}><span className="iptv-poster"><img src={`https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" /><span><Play /></span></span><strong>{m.title}</strong><small>{m.lang} · {m.duration}</small></Button></article>)}</div>;
  const seriesGrid = <div className="iptv-series-grid">{seriesList.map((s) => <article className="iptv-series" key={s.id}>{heart(`series:${s.id}`,s.title)}<Button variant="ghost" className="iptv-series-play" aria-label={`حلقات ${s.title}`} onClick={() => { setOpened(s); setQuery(""); if(view === "favorites") void navigate({ to:"/iptv", search:{view:"series"} }); }}><img src={s.coverImage ?? s.episodes[0]?.image} alt={s.title} loading="lazy" /><span><strong>{s.title}</strong><small><ListVideo />{s.episodes.length} حلقة متاحة</small><ChevronLeft /></span></Button></article>)}</div>;
  return <div className="owner-panel iptv-app" dir="rtl">
    <header className="iptv-header"><Link to="/iptv" search={{ view:"live" }} className="iptv-wordmark"><Crown /><span><strong dir="ltr">ALMOGHANI</strong><small dir="ltr">IPTV</small></span></Link><nav aria-label="أقسام التطبيق" className="iptv-desktop-nav">{views.map(({id,label,icon:Icon}) => <Button key={id} variant="ghost" className={view === id ? "active" : ""} onClick={() => changeView(id)}><Icon />{label}</Button>)}</nav><div className="iptv-header-actions"><Button variant="ghost" size="icon" aria-label="تثبيت التطبيق" title="تثبيت التطبيق" onClick={async () => { if(install) { await install.prompt(); await install.userChoice; setInstall(null); } else setInstallHelp(true); }}><Download /></Button><Button variant="ghost" size="icon" aria-label="المزيد" title="المزيد" onClick={() => setMenu(true)}><Settings /></Button></div></header>
    <main className="iptv-main"><div className="iptv-page-heading"><div><span className="iptv-eyebrow">ALMOGHANI IPTV</span><h1>{opened?.title ?? title}</h1></div><span className="iptv-count">{count} {view === "movies" ? "فيلم" : view === "series" ? opened ? "حلقة" : "مسلسل" : view === "favorites" ? "عنصر" : "قناة"}</span></div>
      <div className="iptv-workspace">
        <aside className="iptv-sidebar"><span className="iptv-sidebar-title">المكتبة</span>{views.map(({ id,label,icon:Icon }) => <Button variant="ghost" key={id} className={view === id ? "active" : ""} onClick={() => changeView(id)}><Icon />{label}<ChevronLeft /></Button>)}<div className="iptv-sidebar-divider" /><Button asChild variant="ghost"><Link to="/vip"><LockKeyhole />سمارتر الخاص<ChevronLeft /></Link></Button><Button asChild variant="ghost"><Link to="/"><House />الموقع الرئيسي<ChevronLeft /></Link></Button></aside>
        <div className="iptv-content">
          {(view === "live" || playing || (view === "favorites" && selected)) && <section className="iptv-watch" ref={player} aria-label="شاشة المشاهدة"><div className="iptv-screen">{playing ? <iframe referrerPolicy="strict-origin-when-cross-origin" src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`} title={playing.title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen /> : current ? <LivePlayer key={current.id} channel={current} compact settingsOpen={settings} /> : <p>لا يوجد بث متاح حاليًا.</p>}</div><div className="iptv-now"><div><span className="iptv-eyebrow">{playing ? "يُعرض الآن" : "بث مباشر"}</span><h2>{playing?.title ?? current?.name}</h2><p>{playing?.subtitle ?? current?.category}</p></div><div className="iptv-now-actions">{playing ? <><Button size="icon" variant="ghost" title="إغلاق المشاهدة" aria-label="إغلاق المشاهدة" onClick={() => setPlaying(null)}><X /></Button>{opened && <><Button variant="outline" size="icon" aria-label="الحلقة السابقة" disabled={episodeIndex <= 0} onClick={() => { const e=episodes[episodeIndex-1]; if(e)watchEpisode(e,opened); }}><ChevronRight /></Button><Button variant="outline" size="icon" aria-label="الحلقة التالية" disabled={episodeIndex<0 || episodeIndex>=episodes.length-1} onClick={() => { const e=episodes[episodeIndex+1]; if(e)watchEpisode(e,opened); }}><ChevronLeft /></Button></>}</> : current && <>{heart(`live:${current.id}`,current.name)}<Button variant="ghost" size="icon" title="إعدادات المشغّل" aria-label="إعدادات المشغّل" onClick={() => setSettings(!settings)}><Settings /></Button></>}</div></div></section>}
          <label className="iptv-search"><Search /><input type="search" aria-label="بحث التطبيق" placeholder={opened ? "البحث عن حلقة…" : "البحث عن قناة، فيلم أو مسلسل…"} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          {view === "live" && <div className="iptv-filters" aria-label="تصنيف القنوات">{["الكل",...channelCategories].map((c) => <Button key={c} variant="outline" size="sm" className={category === c ? "active" : ""} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}</div>}
          {view === "movies" && <div className="iptv-filters" aria-label="لغة الأفلام">{["الكل","عربي","عالمي"].map((l) => <Button key={l} variant="outline" size="sm" className={language === l ? "active" : ""} aria-pressed={language === l} onClick={() => setLanguage(l)}>{l}</Button>)}</div>}
          {opened && <Button variant="outline" className="mb-4" onClick={() => {setOpened(null);setQuery("");setPlaying(null);}}><ChevronRight />جميع المسلسلات</Button>}
          {view === "live" && channelGrid}{view === "movies" && movieGrid}{view === "series" && (opened ? <div className="iptv-movie-grid">{episodes.filter((e) => matches(`${e.title} ${e.number}`)).map((e) => <article className="iptv-movie" key={e.youtubeId}><Button variant="ghost" className="iptv-movie-play" aria-label={`شاهد الحلقة ${e.number}`} onClick={() => watchEpisode(e,opened)}><span className="iptv-poster"><img src={e.image} alt="" loading="lazy" /><span><Play /></span></span><strong>الحلقة {e.number}</strong><small>{opened.title}</small></Button></article>)}</div> : seriesGrid)}
          {view === "favorites" && <>{channels.length>0 && <section className="iptv-favorite-section"><h2>القنوات المفضلة</h2>{channelGrid}</section>}{movieList.length>0 && <section className="iptv-favorite-section"><h2>الأفلام المفضلة</h2>{movieGrid}</section>}{seriesList.length>0 && <section className="iptv-favorite-section"><h2>المسلسلات المفضلة</h2>{seriesGrid}</section>}</>}
          {((view === "live" && !channels.length) || (view === "movies" && !movieList.length) || (view === "series" && !(opened ? episodes.filter((e) => matches(`${e.title} ${e.number}`)).length : seriesList.length)) || (view === "favorites" && !channels.length && !movieList.length && !seriesList.length)) && <div className="iptv-empty"><Heart /><p>{view === "favorites" && !query ? "لم تُضف شيئًا إلى المفضلة بعد." : "لا توجد نتائج مطابقة."}</p></div>}
        </div>
      </div>
    </main>
    <nav className="iptv-bottom-nav" aria-label="التنقل السريع للتطبيق">{views.map(({id,label,icon:Icon}) => <Button variant="ghost" key={id} className={view === id ? "active" : ""} onClick={() => changeView(id)}><Icon /><span>{label}</span></Button>)}</nav>
    <Dialog open={menu} onOpenChange={setMenu}><DialogContent className="owner-panel w-[calc(100%-32px)] rounded-lg" dir="rtl"><DialogTitle>المزيد</DialogTitle><DialogDescription className="sr-only">الحساب والمكتبة</DialogDescription>{[{to:"/auth",label:"دخول الأعضاء"},{to:"/vip",label:"سمارتر الخاص"},{to:"/chat",label:"الدردشة"},{to:"/contact",label:"التواصل"},{to:"/",label:"الموقع الرئيسي"}].map((d) => <Button asChild variant="outline" key={d.to}><Link to={d.to} onClick={() => setMenu(false)}>{d.label}<ChevronLeft /></Link></Button>)}</DialogContent></Dialog>
    <Dialog open={installHelp} onOpenChange={setInstallHelp}><DialogContent className="owner-panel w-[calc(100%-32px)] rounded-lg" dir="rtl"><DialogTitle>تثبيت ALMOGHANI IPTV</DialogTitle><DialogDescription>على الآيفون: المشاركة ثم «إضافة إلى الشاشة الرئيسية». على أندرويد: قائمة المتصفح ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</DialogDescription><img src="/icon-192.png" alt="ALMOGHANI IPTV" className="mx-auto h-20 w-20 rounded-lg" /></DialogContent></Dialog>
  </div>;
}