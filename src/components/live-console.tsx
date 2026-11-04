import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Crown, Film, Heart, Home, LayoutGrid, Menu, Newspaper, Search, Settings, Tv } from "lucide-react";
import { useCatalog } from "@/lib/site-config";
import { LivePlayer } from "@/components/live-player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const categories = [
  { label: "الكل", value: "all", icon: Tv },
  { label: "أفلام", value: "أفلام كاملة", icon: Film },
  { label: "رياضة", value: "رياضية", icon: Film },
  { label: "أخبار", value: "إخبارية", icon: Newspaper },
  { label: "مسلسلات", value: "مسلسلات وأفلام", icon: Tv },
  { label: "إسلامية", value: "إسلامية", icon: Tv },
  { label: "أطفال", value: "أطفال ووثائقي", icon: Tv },
  { label: "عامة", value: "عامة", icon: Tv },
];
const destinations = [
  { to: "/iptv", label: "تطبيق IPTV" },
  { to: "/sections", label: "الأقسام" }, { to: "/movies", label: "الأفلام" },
  { to: "/bedouin-drama", label: "البدوية دراما" }, { to: "/vip", label: "سمارتر" },
  { to: "/auth", label: "دخول الأعضاء" }, { to: "/chat", label: "الدردشة" },
  { to: "/voice-chat", label: "الشات الصوتي" }, { to: "/quran", label: "القرآن الكريم" },
  { to: "/contact", label: "التواصل" }, { to: "/admin", label: "لوحة التحكم" },
  { to: "/portal", label: "واجهة الأقسام السابقة" },
] as const;

export function LiveConsole() {
  const catalog = useCatalog();
  const search = useRouterState({ select: s => s.location.search as { channel?: string } });
  const list = useMemo(() => catalog.filter(c => c.streamUrl || c.youtubeId || c.youtubeChannelId), [catalog]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [view, setView] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const playerRef = useRef<HTMLElement>(null);
  const current = list.find(c => c.id === selected || (!selected && c.id === search.channel)) ?? list.find(c => c.id === "mbc-1") ?? list[0];
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("almoghani-live-favorites") ?? "[]"); if (Array.isArray(saved)) setFavorites(saved.filter((v): v is string => typeof v === "string")); } catch { /* optional storage */ }
  }, []);
  const filtered = list.filter(c => (category === "all" || c.category === category) && (view !== "favorites" || favorites.includes(c.id)) && `${c.name} ${c.category} ${c.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toggleFavorite = (id: string) => {
    setFavorites(prev => { const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]; try { localStorage.setItem("almoghani-live-favorites", JSON.stringify(next)); } catch { /* optional storage */ } return next; });
  };
  const go = (step: number) => { if (!current || !list.length) return; const index = list.findIndex(c => c.id === current.id); setSelected(list[(index + step + list.length) % list.length]?.id ?? null); };
  if (!current) return <div className="live-reference">لا توجد قنوات متاحة حاليًا</div>;
  return <div className="live-reference" dir="rtl">
    <div className="live-reference-wrap">
      <header className="live-reference-header" dir="ltr">
        <Button variant="ghost" size="icon" title="القائمة" aria-label="القائمة" onClick={() => setMenuOpen(true)}><Menu /></Button>
        <Link to="/" className="live-reference-brand"><Crown aria-hidden="true" /><h1>ALMOGHANI LIVE</h1></Link>
        <Button variant="ghost" size="icon" title="إعدادات المشغل" aria-label="إعدادات المشغل" aria-pressed={settingsOpen} onClick={() => setSettingsOpen(v => !v)}><Settings /></Button>
      </header>
      <label className="live-reference-search"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="البحث عن قناة أو محتوى…" aria-label="البحث عن قناة أو محتوى" /><Search aria-hidden="true" /></label>
      <div className="live-reference-layout">
        <section ref={playerRef} className="live-reference-player" aria-label="مشغل البث">
          <LivePlayer key={current.id} channel={current} compact settingsOpen={settingsOpen} />
          <div className="live-reference-now"><span><strong>{current.name}</strong><small>{current.category}</small></span><div>
            <Button variant="ghost" size="icon" title="القناة السابقة" aria-label="القناة السابقة" onClick={() => go(-1)}><ChevronRight /></Button>
            <Button variant="ghost" size="icon" title={favorites.includes(current.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-label={favorites.includes(current.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(current.id)} onClick={() => toggleFavorite(current.id)}><Heart className={favorites.includes(current.id) ? "fill-current" : ""} /></Button>
            <Button variant="ghost" size="icon" title="القناة التالية" aria-label="القناة التالية" onClick={() => go(1)}><ChevronLeft /></Button>
          </div></div>
        </section>
        <section className="live-reference-catalog" aria-label={view === "favorites" ? "القنوات المفضلة" : "دليل القنوات"}>
          <div className="live-reference-categories" dir="ltr">{categories.map(({ label, value, icon: Icon }) => <Button key={value} variant="outline" className={category === value ? "live-category active" : "live-category"} onClick={() => setCategory(value)} aria-pressed={category === value}><Icon />{label}</Button>)}</div>
          {view === "favorites" && <h2 className="live-reference-label">المفضلة</h2>}
          <ul className="live-reference-list">{filtered.map((c, rowIndex) => <li key={`${c.id}-${rowIndex}`}>
            <Button variant="ghost" className={`live-reference-channel ${current.id === c.id ? "selected" : ""}`} aria-label={`تشغيل ${c.name}`} aria-pressed={current.id === c.id} onClick={() => { setSelected(c.id); if (window.matchMedia("(max-width: 900px)").matches) playerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }}>
              {c.thumbnail ? <img src={c.thumbnail} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="live-channel-logo-fallback"><Tv /></span>}
              <span className="live-channel-copy"><strong>{c.name}</strong><small>{c.description || c.category}</small></span>
              <span className="live-channel-number">{String(list.findIndex(v => v.id === c.id) + 1).padStart(3, "0")}</span><ChevronLeft />
            </Button>
          </li>)}</ul>
          {!filtered.length && <p className="live-reference-empty">{view === "favorites" ? "لا توجد قنوات مفضلة ضمن هذا البحث" : "لا توجد قنوات مطابقة للبحث"}</p>}
        </section>
      </div>
    </div>
    <nav className="live-reference-nav" aria-label="التنقل السريع">
      <Button variant="ghost" className={view === "home" ? "active" : ""} onClick={() => { setView("home"); setQuery(""); setCategory("all"); window.scrollTo({ top: 0, behavior: "auto" }); }}><Home /><span>الرئيسية</span></Button>
      <Button variant="ghost" className={view === "guide" ? "active" : ""} onClick={() => { setView("guide"); setQuery(""); setCategory("all"); document.querySelector(".live-reference-catalog")?.scrollIntoView({ block: "start" }); }}><Tv /><span>دليل القنوات</span></Button>
      <Button variant="ghost" className={view === "favorites" ? "active" : ""} onClick={() => { setView("favorites"); setCategory("all"); setQuery(""); }}><Heart /><span>المفضلة</span></Button>
      <Button variant="ghost" onClick={() => setMenuOpen(true)}><LayoutGrid /><span>المزيد</span></Button>
    </nav>
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogContent className="live-reference-dialog" dir="rtl"><DialogTitle>ALMOGHANI LIVE</DialogTitle><DialogDescription>الأقسام والحساب</DialogDescription><div className="live-reference-destinations">{destinations.map(d => <Button asChild variant="outline" key={d.to}><Link to={d.to} onClick={() => setMenuOpen(false)}>{d.label}<ChevronLeft /></Link></Button>)}</div></DialogContent></Dialog>
  </div>;
}
