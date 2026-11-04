import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Plus, Upload, Link2, Save, Search, Tv, Pencil, Eye, EyeOff, Trash2, ArrowRight, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { channels as baseChannels } from "@/lib/channels";
import { useSiteConfig, siteConfigKey, channelCategories } from "@/lib/site-config";
import { checkStreamUrl } from "@/lib/admin.functions";
import { fetchOfficialPlaylist } from "@/lib/channel-playlist.functions";
import { publicChannelUrl, readChannelPlaylist, type PlaylistChannel } from "@/lib/channel-playlist";

const input = "h-11 w-full min-w-0 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary";
type EditChannel = PlaylistChannel & { id?: string; custom?: boolean };
const empty: EditChannel = { name: "", url: "", logo: "", category: "عامة" };

export function EasyChannelPanel() {
  const { data, isPending } = useSiteConfig();
  const qc = useQueryClient();
  const check = useServerFn(checkStreamUrl);
  const fetchPlaylist = useServerFn(fetchOfficialPlaylist);
  const file = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [filter, setFilter] = useState("الكل");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditChannel | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [pending, setPending] = useState<PlaylistChannel[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [deleting, setDeleting] = useState<EditChannel | null>(null);
  const overrides = new Map((data?.overrides ?? []).map((o) => [o.channel_id, o]));
  const catalog = useMemo(() => [
    ...baseChannels.map((c) => ({ id: c.id, name: c.name, category: c.category, logo: c.thumbnail, url: c.streamUrl ?? (c.youtubeId ? `https://www.youtube.com/watch?v=${c.youtubeId}` : ""), custom: false })),
    ...(data?.customChannels ?? []).map((c) => ({ id: c.id, name: c.name, category: c.category as EditChannel["category"], logo: c.logo, url: c.stream_url, custom: true })),
  ], [data]);
  const all = catalog.map((c) => ({ ...c, name: overrides.get(c.id)?.name || c.name, category: (overrides.get(c.id)?.category || c.category) as EditChannel["category"], hidden: overrides.get(c.id)?.hidden ?? false }));
  const filtered = all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) && (category === "الكل" || c.category === category) && (filter === "الكل" || (filter === "المخفية" ? c.hidden : c.custom)));
  const shown = filtered.slice((page - 1) * 24, page * 24);
  const refresh = () => qc.invalidateQueries({ queryKey: siteConfigKey });
  function resetMessage() { setError(""); setMessage(""); }
  async function action(work: () => Promise<void>) {
    setBusy(true); resetMessage();
    try { await work(); await refresh(); }
    catch (e) { setError(e instanceof Error && e.message.startsWith("الرابط") ? e.message : "تعذّر الحفظ؛ تحقق من الاتصال وحاول مجددًا."); }
    finally { setBusy(false); }
  }
  async function override(id: string, patch: { hidden?: boolean; name?: string; category?: string }) {
    const old = overrides.get(id);
    const { error } = await supabase.from("channel_overrides").upsert({ channel_id: id, hidden: patch.hidden ?? old?.hidden ?? false, name: patch.name ?? old?.name ?? null, category: patch.category ?? old?.category ?? null, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  async function saveChannel(e: React.FormEvent) {
    e.preventDefault(); if (!editor) return;
    await action(async () => {
      if (!editor.id || editor.custom) {
        if (!publicChannelUrl(editor.url)) throw new Error("الرابط يجب أن يكون عامًا وآمنًا دون بيانات اشتراك خاصة.");
        const result = await check({ data: { url: editor.url.trim() } });
        if (!result.ok) { setError(result.reason); return; }
        const row = { name: editor.name.trim(), category: editor.category, stream_url: editor.url.trim(), logo: editor.logo.trim() };
        const response = editor.id ? await supabase.from("custom_channels").update(row).eq("id", editor.id) : await supabase.from("custom_channels").insert({ id: `c-${crypto.randomUUID()}`, ...row });
        if (response.error) throw response.error;
      } else await override(editor.id, { name: editor.name.trim(), category: editor.category });
      setEditor(null); setMessage("تم حفظ القناة للجميع ✓");
    });
  }
  function preview(text: string) {
    resetMessage();
    try {
      const result = readChannelPlaylist(text);
      const existing = new Set(catalog.map((c) => c.url));
      const unique = result.channels.filter((c) => !existing.has(c.url));
      setPending(unique);
      setMessage(`جاهزة للإضافة: ${unique.length} قناة • تم تجاوز ${result.skipped + result.channels.length - unique.length} رابط مكرر أو غير مناسب.`);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر قراءة الملف."); }
  }
  async function importLink(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); resetMessage();
    try { preview(await fetchPlaylist({ data: { url: playlistUrl.trim() } })); setLinkOpen(false); }
    catch { setError("تعذّر تحميل القائمة؛ استخدم رابط iptv-org أو ارفع ملف M3U."); }
    finally { setBusy(false); }
  }
  async function saveImport() {
    await action(async () => {
      const valid: PlaylistChannel[] = []; const failed: PlaylistChannel[] = [];
      for (let i = 0; i < pending.length; i += 4) {
        setProgress(`فحص ${Math.min(i + 4, pending.length)} من ${pending.length}`);
        await Promise.all(pending.slice(i, i + 4).map(async (c) => {
          try { const r = await check({ data: { url: c.url } }); (r.ok ? valid : failed).push(c); }
          catch { failed.push(c); }
        }));
      }
      if (valid.length) {
        const { error } = await supabase.from("custom_channels").insert(valid.map((c) => ({ id: `c-${crypto.randomUUID()}`, name: c.name, category: c.category, stream_url: c.url, logo: c.logo })));
        if (error) throw error;
      }
      setPending(failed); setProgress("");
      setMessage(`تم حفظ ${valid.length} قناة للجميع ✓${failed.length ? ` • ${failed.length} رابط لم يستجب؛ لم يُحفظ.` : ""}`);
    });
  }
  function exportPlaylist() {
    const clean = (value: string) => value.replace(/[\r\n"]/g, " ");
    const text = "#EXTM3U\n" + all.filter((c) => !c.hidden && publicChannelUrl(c.url)).map((c) => `#EXTINF:-1 tvg-logo="${clean(c.logo)}" group-title="${clean(c.category)}",${clean(c.name)}\n${c.url}`).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "audio/x-mpegurl;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "almoghani-channels.m3u"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="owner-panel min-h-dvh" dir="rtl">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4"><Link to="/" className="flex items-center gap-2 font-bold text-primary"><Crown className="h-7 w-7" /><span dir="ltr">ALMOGHANI LIVE</span></Link><div className="flex gap-2"><Button asChild size="sm" variant="outline"><Link to="/admin">اللوحة الكاملة</Link></Button><Button size="icon" variant="ghost" title="تسجيل الخروج" aria-label="تسجيل الخروج" onClick={() => void supabase.auth.signOut()}><LogOut /></Button></div></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs text-muted-foreground">إدارة البث</p><h1 className="text-2xl font-bold text-primary">لوحة القنوات</h1></div><Button asChild variant="outline" size="sm"><Link to="/live"><ArrowRight />فتح القنوات</Link></Button></div>
      <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border py-4">{[["كل القنوات", all.length], ["المضافة", all.filter((c) => c.custom).length], ["المخفية", all.filter((c) => c.hidden).length]].map(([label, count]) => <div className="px-3 text-center" key={label}><dd className="text-2xl font-bold">{count}</dd><dt className="mt-1 text-xs text-muted-foreground">{label}</dt></div>)}</dl>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Button disabled={busy} onClick={() => { resetMessage(); setEditor({ ...empty }); }}><Plus />إضافة قناة</Button><Button disabled={busy} variant="outline" onClick={() => file.current?.click()}><Upload />استيراد M3U</Button><Button disabled={busy} variant="outline" onClick={() => { resetMessage(); setLinkOpen(true); }}><Link2 />استيراد من رابط</Button><Button disabled={busy} variant="outline" onClick={exportPlaylist}><Download />تنزيل القنوات</Button></div>
      <input ref={file} hidden type="file" accept=".m3u,.m3u8" onChange={async (e) => { const selected = e.target.files?.[0]; if (selected) { if (selected.size > 2_000_000) setError("الملف أكبر من 2 ميجابايت."); else preview(await selected.text()); } e.target.value = ""; }} />
      {message && <p role="status" className="text-sm text-primary">{message}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {pending.length > 0 && <section className="space-y-3 border-y border-border py-5"><h2 className="font-bold">القنوات المستوردة ({pending.length})</h2><div className="max-h-64 space-y-2 overflow-y-auto">{pending.map((c, i) => <div key={c.url} className="flex items-center gap-2"><input aria-label={`اسم القناة المستوردة ${i + 1}`} className={input} value={c.name} disabled={busy} onChange={(e) => setPending(pending.map((v, n) => n === i ? { ...v, name: e.target.value } : v))} /><select aria-label={`قسم القناة المستوردة ${i + 1}`} className={`${input} max-w-36`} value={c.category} disabled={busy} onChange={(e) => setPending(pending.map((v, n) => n === i ? { ...v, category: e.target.value as PlaylistChannel["category"] } : v))}>{channelCategories.map((cat) => <option key={cat}>{cat}</option>)}</select><Button variant="ghost" size="icon" disabled={busy} aria-label={`حذف من الاستيراد ${c.name}`} onClick={() => setPending(pending.filter((_, n) => n !== i))}><Trash2 /></Button></div>)}</div><div className="flex flex-wrap gap-2"><Button disabled={busy || pending.some((c) => !c.name.trim())} onClick={saveImport}><Save />{busy ? progress || "جارٍ الحفظ…" : "فحص وحفظ للجميع"}</Button><Button variant="outline" disabled={busy} onClick={() => setPending([])}>إلغاء الاستيراد</Button></div></section>}
      <section className="space-y-4"><div className="flex items-center gap-2"><Search className="h-5 w-5 shrink-0 text-muted-foreground" /><input className={input} aria-label="البحث عن قناة" placeholder="البحث عن قناة…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></div><div className="flex flex-wrap gap-2"><select aria-label="تصفية حسب القسم" className={`${input} flex-1 basis-44`} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option>الكل</option>{channelCategories.map((c) => <option key={c}>{c}</option>)}</select><select aria-label="تصفية القنوات" className={`${input} flex-1 basis-32`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}><option>الكل</option><option>المضافة</option><option>المخفية</option></select></div><h2 className="text-sm text-muted-foreground">القنوات — {filtered.length}</h2>
      {isPending ? <p role="status">جارٍ تحميل القنوات…</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map((c) => <article key={c.id} className={`rounded-lg border border-border bg-secondary p-3 ${c.hidden ? "opacity-65" : ""}`}><div className="flex min-h-16 items-center gap-3"><div className="grid h-14 w-16 shrink-0 place-items-center rounded bg-background">{c.logo ? <img className="h-12 w-14 object-contain" src={c.logo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <Tv className="text-primary" />}</div><div className="min-w-0"><h3 className="break-words text-sm font-bold">{c.name}</h3><p className="mt-1 text-xs text-muted-foreground">{c.category} · {c.hidden ? "مخفية" : "ظاهرة"}{c.custom ? " · مضافة" : ""}</p></div></div><div className="mt-3 flex justify-end gap-1 border-t border-border pt-2"><Button size="sm" variant="ghost" disabled={busy} onClick={() => { resetMessage(); setEditor(c); }}><Pencil className="h-4 w-4" />تعديل</Button><Button size="icon" variant="ghost" title={c.hidden ? "إظهار القناة" : "إخفاء القناة"} aria-label={`${c.hidden ? "إظهار" : "إخفاء"} ${c.name}`} disabled={busy} onClick={() => action(async () => { await override(c.id, { hidden: !c.hidden }); setMessage(c.hidden ? "تم إظهار القناة ✓" : "تم إخفاء القناة ✓"); })}>{c.hidden ? <EyeOff /> : <Eye />}</Button>{c.custom && <Button size="icon" variant="ghost" title="حذف القناة" aria-label={`حذف ${c.name}`} disabled={busy} onClick={() => setDeleting(c)}><Trash2 className="text-destructive" /></Button>}</div></article>)}</div>}
      {!isPending && !filtered.length && <p className="py-8 text-center text-muted-foreground">لا توجد قنوات مطابقة.</p>}{filtered.length > 24 && <div className="flex items-center justify-center gap-4"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</Button><span className="text-sm">{page} / {Math.ceil(filtered.length / 24)}</span><Button size="sm" variant="outline" disabled={page * 24 >= filtered.length} onClick={() => setPage(page + 1)}>التالي</Button></div>}</section>
    </main>
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}><DialogContent className="owner-panel w-[calc(100%-32px)] max-h-[85dvh] overflow-y-auto rounded-lg" dir="rtl"><DialogTitle>{editor?.id ? "تعديل القناة" : "إضافة قناة"}</DialogTitle><DialogDescription className="sr-only">بيانات القناة</DialogDescription>{editor && <form onSubmit={saveChannel} className="space-y-4"><label className="block space-y-2 text-sm">اسم القناة<input className={input} required maxLength={80} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></label><label className="block space-y-2 text-sm">القسم<select className={input} value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value as PlaylistChannel["category"] })}>{channelCategories.map((c) => <option key={c}>{c}</option>)}</select></label>{(!editor.id || editor.custom) && <><label className="block space-y-2 text-sm">رابط البث العام<input className={input} type="url" dir="ltr" required maxLength={1000} value={editor.url} onChange={(e) => setEditor({ ...editor, url: e.target.value })} /></label><label className="block space-y-2 text-sm">رابط الشعار (اختياري)<input className={input} type="url" dir="ltr" pattern="https://.*" maxLength={1000} value={editor.logo} onChange={(e) => setEditor({ ...editor, logo: e.target.value })} /></label></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full"><Save />{busy ? "جارٍ الفحص والحفظ…" : "حفظ القناة"}</Button></form>}</DialogContent></Dialog>
    <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent className="owner-panel w-[calc(100%-32px)] rounded-lg" dir="rtl"><DialogTitle>استيراد من رابط</DialogTitle><DialogDescription>قائمة قنوات عامة من iptv-org؛ الملفات الأخرى يمكن رفعها من زر استيراد M3U.</DialogDescription><form onSubmit={importLink} className="space-y-4"><label className="block space-y-2 text-sm">رابط ملف M3U<input className={input} type="url" required dir="ltr" value={playlistUrl} placeholder="https://iptv-org.github.io/iptv/countries/sa.m3u" onChange={(e) => setPlaylistUrl(e.target.value)} /></label><Button type="submit" disabled={busy} className="w-full"><Link2 />{busy ? "جارٍ التحميل…" : "تحميل القنوات"}</Button></form></DialogContent></Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}><DialogContent className="owner-panel w-[calc(100%-32px)] rounded-lg" dir="rtl"><DialogTitle>حذف القناة؟</DialogTitle><DialogDescription>{deleting?.name}</DialogDescription><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={() => action(async () => { if (!deleting?.id) return; const { error } = await supabase.from("custom_channels").delete().eq("id", deleting.id); if (error) throw error; setDeleting(null); setMessage("تم حذف القناة ✓"); })}><Trash2 />حذف</Button><Button variant="outline" onClick={() => setDeleting(null)}>إلغاء</Button></div></DialogContent></Dialog>
  </div>;
}