import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/components/member-provider";
import { Button } from "@/components/ui/button";
import { ScheduleManager } from "@/components/admin/schedule-manager";
import { ContentManager } from "@/components/admin/content-manager";
import { SectionEditor } from "@/components/admin/section-editor";
import { AdminPasswordLogin } from "@/components/admin/password-login";

import { channels as baseChannels } from "@/lib/channels";
import { movies as baseMovies } from "@/lib/movies";
import { listMembers, listRoles, setMemberRole, findMemberByEmail, checkStreamUrl, createMember, setMemberPassword } from "@/lib/admin.functions";
import {
  useSiteConfig, siteConfigKey, channelCategories, youtubeIdFrom,
  siteFonts, designColorFields, defaultTexts, defaultContacts, defaultDesign, defaultAd, defaultTicker, defaultChat, type SiteTexts, safeLibraryLink, safeHttpsImage, type SiteContacts, type SiteDesign, type SiteAd, type SiteTicker,
} from "@/lib/site-config";

const ADMIN_SECTIONS = [
  { id: "sections", label: "الصور وترتيب الأقسام", content: SectionEditor },
  { id: "channels", label: "القنوات", content: ChannelsTab },
  { id: "movies", label: "الأفلام", content: MoviesTab },
  { id: "content", label: "الإضافة الجماعية", content: ContentManager },
  { id: "schedule", label: "مواعيد البث", content: ScheduleManager },
  { id: "members", label: "الأعضاء والصلاحيات", content: MembersTab },
  { id: "settings", label: "إعدادات الموقع", content: SiteSettingsTab },
  { id: "texts", label: "النصوص والتواصل", content: TextsTab },
  { id: "design", label: "التصميم", content: DesignTab },
  { id: "ads", label: "الإعلان والشريط", content: AdsTab },
  { id: "overview", label: "الإحصاءات", content: OverviewTab },
];

export const Route = createFileRoute("/admin")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { tab?: string | undefined } => ({ tab: typeof s["tab"] === "string" ? s["tab"] : undefined }),
  head: () => ({ meta: [
    { title: "لوحة التحكم — المغني" },
    { name: "description", content: "لوحة تحكم مالك موقع المغني لايف." },
    { property: "og:title", content: "لوحة التحكم — المغني" },
    { property: "og:description", content: "إدارة القنوات والأفلام والأعضاء والتصميم." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
    { name: "apple-mobile-web-app-title", content: "اللوحة" },
  ],
  }),
  component: AdminPage,
});

const input = "h-11 w-full rounded-lg border border-border bg-card px-3 text-foreground outline-none focus:border-primary";

function AdminPage() {
  const { user, ready } = useMember();
  const { tab } = Route.useSearch();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { setAdmin(null); if (user) void supabase.rpc("claim_owner_admin").then(({ data }) => setAdmin(!!data)); }, [user]);
  useEffect(() => {
    if (admin && tab) document.getElementById(`admin-${tab}`)?.scrollIntoView({ block: "start" });
  }, [admin, tab]);

  if (!ready) return null;
  if (!user) return <AdminPasswordLogin />;
  if (admin === null) return <Center>جارٍ التحقق…</Center>;
  if (!admin) return <AdminPasswordLogin />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-4 sm:px-6"><Link to="/" className="flex items-center gap-2 font-bold"><ArrowRight className="h-5 w-5" />ALMOGHANI LIVE</Link></header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">لوحة التحكم</h1>
        <Button asChild className="mt-4"><Link to="/admin-chat">لوحة الشات (المستخدمين والأصوات)</Link></Button>
        <nav aria-label="أقسام لوحة التحكم" className="my-6 flex flex-wrap gap-2">
          {ADMIN_SECTIONS.map(({ id, label }) => <Button key={id} asChild size="sm" variant="outline"><a href={`#admin-${id}`}>{label}</a></Button>)}
        </nav>
        {ADMIN_SECTIONS.map(({ id, label, content: Content }) => <section key={id} id={`admin-${id}`} aria-label={label} className="scroll-mt-24 space-y-6 border-t border-border py-8">
          <h2 className="font-display text-2xl font-black">{label}</h2>
          <Content />
        </section>)}
      </main>
    </div>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: siteConfigKey });
}

function ChannelsTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const check = useServerFn(checkStreamUrl);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", category: "عامة", url: "", logo: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const overrides = new Map((data?.overrides ?? []).map((o) => [o.channel_id, o]));
  const all = useMemo(() => [
    ...(data?.customChannels ?? []).map((c) => ({ id: c.id, name: c.name, category: c.category, custom: true })),
    ...baseChannels.map((c) => ({ id: c.id, name: c.name, category: c.category as string, custom: false })),
  ], [data]);
  const list = all.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 80);

  async function setOverride(id: string, patch: { hidden?: boolean; category?: string | null; name?: string | null }) {
    const cur = overrides.get(id);
    await supabase.from("channel_overrides").upsert({ channel_id: id, hidden: patch.hidden ?? cur?.hidden ?? false, category: patch.category !== undefined ? patch.category : cur?.category ?? null, name: patch.name !== undefined ? patch.name : cur?.name ?? null, updated_at: new Date().toISOString() });
    void refresh();
  }
  async function setCategory(c: { id: string; custom: boolean }, category: string) {
    if (c.custom) { await supabase.from("custom_channels").update({ category }).eq("id", c.id); void refresh(); }
    else void setOverride(c.id, { category });
  }
  async function rename(c: { id: string; name: string; custom: boolean }) {
    const v = window.prompt("الاسم الجديد للقناة", c.name)?.trim().slice(0, 80);
    if (!v || v === c.name) return;
    if (c.custom) { await supabase.from("custom_channels").update({ name: v }).eq("id", c.id); void refresh(); }
    else void setOverride(c.id, { name: v });
  }
  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg(""); setBusy(true);
    try {
      const r = await check({ data: { url: form.url.trim() } });
      if (!r.ok) { setMsg(r.reason); return; }
      const { error } = await supabase.from("custom_channels").insert({ id: `c-${crypto.randomUUID().slice(0, 8)}`, name: form.name.trim().slice(0, 80), category: form.category, stream_url: form.url.trim(), logo: form.logo.trim().startsWith("https://") ? form.logo.trim() : "" });
      if (error) { setMsg("تعذّر الحفظ."); return; }
      setForm({ ...form, name: "", url: "", logo: "" }); setMsg("أُضيفت القناة ✓"); void refresh();
    } catch { setMsg("الرابط غير صالح."); } finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-border bg-card/50 p-4">
      <h2 className="font-black">إضافة قناة</h2>
      <input className={input} placeholder="اسم القناة" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{channelCategories.map((c) => <option key={c}>{c}</option>)}</select>
      <input className={input} dir="ltr" placeholder="رابط البث (يوتيوب أو m3u8)" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <input className={input} dir="ltr" placeholder="رابط الشعار (اختياري)" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
      <Button type="submit" disabled={busy}>{busy ? "جارٍ فحص الرابط…" : "فحص وإضافة"}</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
    <div>
      <input className={input} placeholder="ابحث عن قناة…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-3 divide-y divide-border">
        {list.map((c) => {
          const o = overrides.get(c.id); const hidden = !!o?.hidden;
          const category = c.custom ? c.category : o?.category ?? c.category;
          const name = c.custom ? c.name : o?.name || c.name;
          return <li key={c.id} className={`flex flex-wrap items-center gap-2 py-3 ${hidden ? "opacity-50" : ""}`}>
            <span className="min-w-0 flex-1 font-bold">{name}{c.custom && <span className="ms-2 text-xs text-accent">مضافة</span>}</span>
            <select className="h-9 rounded-lg border border-border bg-card px-2 text-sm" value={category} onChange={(e) => setCategory(c, e.target.value)}>{channelCategories.map((x) => <option key={x}>{x}</option>)}</select>
            <Button size="icon" variant="ghost" aria-label="تعديل الاسم" onClick={() => rename({ ...c, name })}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={hidden ? "إظهار" : "إخفاء"} onClick={() => setOverride(c.id, { hidden: !hidden })}>{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            {c.custom && <Button size="icon" variant="ghost" aria-label="حذف" onClick={async () => { await supabase.from("custom_channels").delete().eq("id", c.id); void refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </li>;
        })}
      </ul>
    </div>
  </div>;
}

function MoviesTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const check = useServerFn(checkStreamUrl);
  const [form, setForm] = useState({ url: "", title: "", description: "" });
  const [msg, setMsg] = useState("");
  const hidden = new Set(data?.hiddenMovies ?? []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const id = youtubeIdFrom(form.url.trim());
    if (!id) return setMsg("الصق رابط فيديو يوتيوب صحيح.");
    const r = await check({ data: { url: `https://www.youtube.com/watch?v=${id}` } });
    if (!r.ok) return setMsg(r.reason);
    const { error } = await supabase.from("custom_movies").insert({ youtube_id: id, title: form.title.trim().slice(0, 150), description: form.description.trim().slice(0, 400) });
    if (error) return setMsg("تعذّر الحفظ.");
    setForm({ url: "", title: "", description: "" }); setMsg("أُضيف الفيلم ✓"); void refresh();
  }
  async function toggle(id: string) {
    if (hidden.has(id)) await supabase.from("hidden_movies").delete().eq("movie_id", id);
    else await supabase.from("hidden_movies").insert({ movie_id: id });
    void refresh();
  }
  return <div className="space-y-8">
    <form onSubmit={add} className="grid gap-3 rounded-2xl border border-border bg-card/50 p-4">
      <h2 className="font-black">إضافة فيلم</h2>
      <input className={input} dir="ltr" placeholder="رابط يوتيوب" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <input className={input} placeholder="عنوان الفيلم" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className={`${input} h-24 py-2`} placeholder="وصف قصير" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Button type="submit">فحص وإضافة</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </form>
    <ul className="divide-y divide-border">
      {(data?.customMovies ?? []).map((m) => <li key={m.id} className="flex items-center gap-2 py-3"><span className="flex-1 font-bold">{m.title}<span className="ms-2 text-xs text-accent">مضاف</span></span><Button size="icon" variant="ghost" aria-label="تعديل" onClick={async () => { const t = window.prompt("عنوان الفيلم", m.title)?.trim(); if (!t) return; const d = window.prompt("الوصف", m.description) ?? m.description; await supabase.from("custom_movies").update({ title: t.slice(0, 150), description: d.trim().slice(0, 400) }).eq("id", m.id); void refresh(); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="حذف" onClick={async () => { await supabase.from("custom_movies").delete().eq("id", m.id); void refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></li>)}
      {baseMovies.map((m) => <li key={m.id} className={`flex items-center gap-2 py-3 ${hidden.has(m.id) ? "opacity-50" : ""}`}><span className="flex-1">{m.title}</span><Button size="icon" variant="ghost" aria-label={hidden.has(m.id) ? "إظهار" : "إخفاء"} onClick={() => toggle(m.id)}>{hidden.has(m.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></li>)}
    </ul>
  </div>;
}

function MembersTab() {
  const fetchMembers = useServerFn(listMembers);
  const fetchRoles = useServerFn(listRoles);
  const fetchByEmail = useServerFn(findMemberByEmail);
  const setRole = useServerFn(setMemberRole);
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["admin-members"], queryFn: () => fetchMembers() });
  const roles = useQuery({ queryKey: ["admin-roles"], queryFn: () => fetchRoles() });
  const [pin, setPin] = useState(""); const [msg, setMsg] = useState("");
  const [email, setEmail] = useState(""); const [roleMsg, setRoleMsg] = useState(""); const [roleBusy, setRoleBusy] = useState(false);
  const roleMap = useMemo(() => {
    const m = new Map<string, "admin" | "user">();
    for (const r of roles.data ?? []) if (r.role === "admin" || !m.has(r.user_id)) m.set(r.user_id, r.role);
    return m;
  }, [roles.data]);
  async function changeRole(userId: string, role: "admin" | "user") {
    setRoleMsg("");
    try {
      await setRole({ data: { userId, role } });
      setRoleMsg("تم حفظ الصلاحية ✓");
      void qc.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (e) { setRoleMsg(e instanceof Error && e.message ? e.message : "تعذّر الحفظ."); }
  }
  async function addByEmail(e: React.FormEvent) {
    e.preventDefault(); setRoleMsg(""); setRoleBusy(true);
    try {
      const hit = await fetchByEmail({ data: { email } });
      if (!hit) { setRoleMsg("لا يوجد حساب بهذا البريد — يجب أن يسجّل في الموقع أولًا."); return; }
      await setRole({ data: { userId: hit.userId, role: "admin" } });
      setRoleMsg("تم منحه صلاحية المشرف ✓");
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (err) { setRoleMsg(err instanceof Error && err.message ? err.message : "تعذّر الحفظ."); }
    finally { setRoleBusy(false); }
  }
  const addMember = useServerFn(createMember);
  const changePass = useServerFn(setMemberPassword);
  const [nm, setNm] = useState({ name: "", email: "", password: "" }); const [nmMsg, setNmMsg] = useState(""); const [nmBusy, setNmBusy] = useState(false);
  const [passFor, setPassFor] = useState<string | null>(null); const [newPass, setNewPass] = useState(""); const [passMsg, setPassMsg] = useState("");
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "—";
  return <div className="space-y-8">
    <form className="grid gap-3 rounded-2xl border border-border bg-card/50 p-4 sm:grid-cols-3" onSubmit={async (e) => {
      e.preventDefault(); setNmMsg(""); setNmBusy(true);
      try { await addMember({ data: nm }); setNmMsg("تمت إضافة العضو ✓ — يقدر يدخل الآن بالبريد وكلمة المرور."); setNm({ name: "", email: "", password: "" }); void members.refetch(); }
      catch (err) { setNmMsg(err instanceof Error && err.message ? err.message : "تعذّر الإضافة."); } finally { setNmBusy(false); }
    }}>
      <h2 className="font-black sm:col-span-3">إضافة عضو جديد</h2>
      <input aria-label="اسم العضو" className={input} placeholder="اسم العضو" required maxLength={40} value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
      <input aria-label="بريد العضو" className={input} dir="ltr" type="email" placeholder="email@example.com" required value={nm.email} onChange={(e) => setNm({ ...nm, email: e.target.value })} />
      <input aria-label="كلمة مرور العضو" className={input} dir="ltr" type="text" placeholder="كلمة المرور (8 أحرف أو أكثر)" required minLength={8} maxLength={72} value={nm.password} onChange={(e) => setNm({ ...nm, password: e.target.value })} />
      <Button type="submit" disabled={nmBusy} className="sm:col-span-3">{nmBusy ? "جارٍ الإضافة…" : "إضافة العضو"}</Button>
      {nmMsg && <p role="status" className="text-sm text-muted-foreground sm:col-span-3">{nmMsg}</p>}
    </form>
    <div className="grid gap-3 rounded-2xl border border-border bg-card/50 p-4">
      <h2 className="font-black">الصلاحيات</h2>
      <p className="text-sm text-muted-foreground">اختر «مشرف» لمن يريد الدخول للوحة التحكم، أو «عضو» لمن يريد البث والمكتبة فقط.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={addByEmail}>
        <label className="flex-1 space-y-1"><span className="text-sm font-bold">منح صلاحية مشرف بالبريد</span><input className={input} dir="ltr" type="email" placeholder="email@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <Button type="submit" disabled={roleBusy}>{roleBusy ? "جارٍ…" : "منح مشرف"}</Button>
      </form>
      {roleMsg && <p className="text-sm text-muted-foreground">{roleMsg}</p>}
    </div>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card/50 p-4" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      const { error } = await supabase.rpc("admin_set_library_pin", { p_pin: pin });
      setMsg(error ? "تعذّر تغيير الرقم." : "تم تغيير الرقم السري ✓ — كل الجلسات المفتوحة ستطلبه من جديد."); if (!error) setPin("");
    }}>
      <label className="flex-1 space-y-1"><span className="text-sm font-bold">الرقم السري الجديد للمكتبة</span><input className={input} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></label>
      <Button type="submit">تغيير</Button>
      {msg && <p className="w-full text-sm text-muted-foreground">{msg}</p>}
    </form>
    {members.isPending ? <p className="text-muted-foreground">جارٍ التحميل…</p> : members.isError ? <p className="text-destructive">تعذّر تحميل الأعضاء.</p> :
      members.data.length === 0 ? <p className="text-muted-foreground">لا يوجد أعضاء بعد.</p> :
      <ul className="divide-y divide-border">{members.data.map((m) => {
        const r = roleMap.get(m.user_id) ?? "user";
        return <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
        <span className="min-w-0 flex-1"><b>{m.display_name || "عضو"}</b>{m.suspended && <span className="ms-2 text-xs text-destructive">موقوف</span>}<span dir="ltr" className="block text-xs text-muted-foreground">{m.email}</span><span className="block text-xs text-muted-foreground">التسجيل: {fmt(m.created_at)} · آخر دخول: {fmt(m.last_login_at)}</span></span>
        <select className="h-9 rounded-lg border border-border bg-card px-2 text-sm" aria-label="الصلاحية" value={r} onChange={(e) => void changeRole(m.user_id, e.target.value === "admin" ? "admin" : "user")}><option value="user">عضو</option><option value="admin">مشرف</option></select>
        <Button size="sm" variant={m.suspended ? "default" : "outline"} onClick={async () => { await supabase.rpc("admin_set_member_suspended", { p_user: m.user_id, p_suspended: !m.suspended }); void members.refetch(); }}>{m.suspended ? "إعادة التفعيل" : "إيقاف"}</Button>
        <Button size="sm" variant="secondary" onClick={() => { setPassFor(passFor === m.user_id ? null : m.user_id); setNewPass(""); setPassMsg(""); }}>تغيير كلمة المرور</Button>
        {passFor === m.user_id && <form className="flex w-full flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); setPassMsg(""); try { await changePass({ data: { userId: m.user_id, password: newPass } }); setPassMsg("تم تغيير كلمة المرور ✓"); setNewPass(""); } catch (err) { setPassMsg(err instanceof Error && err.message ? err.message : "تعذّر التغيير."); } }}>
          <input aria-label="كلمة المرور الجديدة" className={input + " flex-1"} dir="ltr" type="text" minLength={8} maxLength={72} required placeholder="كلمة المرور الجديدة" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <Button size="sm" type="submit">حفظ</Button>
          {passMsg && <p role="status" className="w-full text-sm text-muted-foreground">{passMsg}</p>}
        </form>}
      </li>; })}</ul>}
  </div>;
}

async function saveSetting(key: string, value: object) {
  return supabase.from("site_settings").upsert({ key, value: value as never, updated_at: new Date().toISOString() });
}

function SiteSettingsTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const [texts, setTexts] = useState<SiteTexts>(defaultTexts);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data) setTexts(data.texts); }, [data]);
  const img = safeHttpsImage(texts.chatImage);
  return <form className="grid gap-4" onSubmit={async (e) => {
    e.preventDefault();
    if (texts.libraryLink && safeLibraryLink(texts.libraryLink) !== texts.libraryLink) { setMsg("رابط المكتبة لازم يبدأ بـ / مثل /vip"); return; }
    if (texts.chatImage && !img) { setMsg("رابط صورة الشات لازم يبدأ بـ https://"); return; }
    const r = await saveSetting("texts", texts); setMsg(r.error ? "تعذّر الحفظ." : "تم الحفظ ✓"); void refresh();
  }}>
    <label className="block space-y-1"><span className="text-sm font-bold">اسم الموقع (يظهر في الشعار أعلى الصفحات)</span><input className={input} dir="ltr" maxLength={40} placeholder="ALMOGHANI LIVE" value={texts.siteName ?? ""} onChange={(e) => setTexts({ ...texts, siteName: e.target.value })} /></label>
    <label className="block space-y-1"><span className="text-sm font-bold">رابط زر المكتبة</span><input className={input} dir="ltr" maxLength={200} placeholder="/vip" value={texts.libraryLink ?? ""} onChange={(e) => setTexts({ ...texts, libraryLink: e.target.value.trim() })} /></label>
    <label className="block space-y-1"><span className="text-sm font-bold">صورة بطاقة الشات في الرئيسية (رابط https)</span><input className={input} dir="ltr" maxLength={1000} placeholder="https://…" value={texts.chatImage ?? ""} onChange={(e) => setTexts({ ...texts, chatImage: e.target.value.trim() })} /></label>
    {img && <img src={img} alt="معاينة صورة الشات" className="max-h-40 w-full rounded-xl object-contain" />}
    <p className="text-xs text-muted-foreground">اترك أي خانة فاضية عشان ترجع للإعداد الأصلي.</p>
    <Button type="submit">حفظ الإعدادات</Button>
    {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
  </form>;
}

function TextsTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const [texts, setTexts] = useState<SiteTexts>(defaultTexts);
  const [contacts, setContacts] = useState<SiteContacts>(defaultContacts);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data) { setTexts(data.texts); setContacts(data.contacts); } }, [data]);
  const field = (label: string, value: string, set: (v: string) => void, ltr = false) => <label className="block space-y-1"><span className="text-sm font-bold">{label}</span><input className={input} dir={ltr ? "ltr" : undefined} value={value} onChange={(e) => set(e.target.value.slice(0, 120))} /></label>;
  return <form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); const a = await saveSetting("texts", texts); const b = await saveSetting("contacts", contacts); setMsg(a.error || b.error ? "تعذّر الحفظ." : "تم الحفظ ✓"); void refresh(); }}>
    <h2 className="font-black">نصوص الرئيسية</h2>
    {field("عنوان البنر", texts.bannerTitle, (v) => setTexts({ ...texts, bannerTitle: v }), true)}
    {field("السطر تحت العنوان", texts.bannerSubtitle, (v) => setTexts({ ...texts, bannerSubtitle: v }))}
    {field("عبارة المكتبة الخاصة", texts.proLabel, (v) => setTexts({ ...texts, proLabel: v }), true)}
    <h2 className="mt-4 font-black">حسابات التواصل</h2>
    {field("واتساب", contacts.whatsapp, (v) => setContacts({ ...contacts, whatsapp: v }), true)}
    {field("البريد", contacts.email, (v) => setContacts({ ...contacts, email: v }), true)}
    {field("سناب شات (اسم المستخدم)", contacts.snapchat, (v) => setContacts({ ...contacts, snapchat: v }), true)}
    {field("إكس (اسم المستخدم)", contacts.x, (v) => setContacts({ ...contacts, x: v }), true)}
    {field("انستقرام (اسم المستخدم)", contacts.instagram, (v) => setContacts({ ...contacts, instagram: v }), true)}
    <Button type="submit">حفظ</Button>
    {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
  </form>;
}

function DesignTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const [design, setDesign] = useState<SiteDesign>(defaultDesign);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data) setDesign(data.design); }, [data]);
  const save = async (d: SiteDesign) => { const r = await saveSetting("design", d); setMsg(r.error ? "تعذّر الحفظ." : "تم الحفظ ✓"); void refresh(); };
  return <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(design); }}>
    <label className="flex items-center gap-3"><input type="color" value={design.primary || "#9333ea"} onChange={(e) => setDesign({ ...design, primary: e.target.value })} className="h-12 w-16 rounded" /><span className="font-bold">اللون الرئيسي</span></label>
    <label className="flex items-center gap-3"><input type="color" value={design.accent || "#22d3ee"} onChange={(e) => setDesign({ ...design, accent: e.target.value })} className="h-12 w-16 rounded" /><span className="font-bold">اللون الثانوي</span></label>
    <div className="grid gap-3 sm:grid-cols-2">{designColorFields.map((f) => <label key={f.key} className="flex items-center gap-3"><input type="color" value={design.colors?.[f.key] || f.def} onChange={(e) => setDesign({ ...design, colors: { ...design.colors, [f.key]: e.target.value } })} className="h-12 w-16 rounded" /><span className="font-bold">{f.label}</span></label>)}</div>
    <label className="block space-y-1"><span className="text-sm font-bold">استدارة الزوايا: {design.radius ?? "افتراضي"}{design.radius !== undefined && "px"}</span><input type="range" min={0} max={32} step={2} value={design.radius ?? 12} onChange={(e) => setDesign({ ...design, radius: Number(e.target.value) })} className="w-full" /></label>
    <label className="block space-y-1"><span className="text-sm font-bold">خط النصوص</span><select className={input} value={design.fontBody ?? ""} onChange={(e) => setDesign({ ...design, fontBody: e.target.value })}><option value="">الافتراضي</option>{siteFonts.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}</select></label>
    <label className="block space-y-1"><span className="text-sm font-bold">خط العناوين</span><select className={input} value={design.fontHeading ?? ""} onChange={(e) => setDesign({ ...design, fontHeading: e.target.value })}><option value="">الافتراضي</option>{siteFonts.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}</select></label>
    <label className="block space-y-1"><span className="text-sm font-bold">حجم الخط: {design.fontScale ?? 100}%</span><input type="range" min={85} max={130} step={5} value={design.fontScale ?? 100} onChange={(e) => setDesign({ ...design, fontScale: Number(e.target.value) })} className="w-full" /></label>
    <p className="rounded-xl border border-border p-4" style={{ fontFamily: design.fontBody || undefined }}><b style={{ fontFamily: design.fontHeading || undefined }}>معاينة العنوان</b><br />هذا مثال على شكل النص في الموقع.</p>
    <label className="block space-y-1"><span className="text-sm font-bold">صورة خلفية البنر (رابط https)</span><input className={input} dir="ltr" placeholder="https://…" value={design.background} onChange={(e) => setDesign({ ...design, background: e.target.value.trim() })} /></label>
    {design.background.startsWith("https://") && <img src={design.background} alt="معاينة الخلفية" className="h-40 w-full rounded-xl object-cover" />}
    <div className="flex gap-2"><Button type="submit">حفظ</Button><Button type="button" variant="outline" onClick={() => { setDesign(defaultDesign); void save(defaultDesign); }}>إرجاع التصميم الأصلي</Button></div>
    {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
  </form>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" className="grid min-h-screen place-items-center bg-background p-6 text-center text-foreground">{children}</div>;
}

function OverviewTab() {
  const { data } = useSiteConfig();
  const fetchMembers = useServerFn(listMembers);
  const members = useQuery({ queryKey: ["admin-members"], queryFn: () => fetchMembers() });
  const chat = useQuery({ queryKey: ["admin-chat-count"], queryFn: async () => (await supabase.from("chat_messages").select("id", { count: "exact", head: true })).count ?? 0 });
  const hiddenCh = (data?.overrides ?? []).filter((o) => o.hidden).length;
  const stats = [
    ["القنوات الظاهرة", baseChannels.length + (data?.customChannels.length ?? 0) - hiddenCh],
    ["القنوات المضافة", data?.customChannels.length ?? 0],
    ["الأفلام", baseMovies.length + (data?.customMovies.length ?? 0) - (data?.hiddenMovies.length ?? 0)],
    ["الأعضاء", members.data?.length ?? "…"],
    ["الأعضاء الموقوفون", members.data?.filter((m) => m.suspended).length ?? "…"],
    ["رسائل الدردشة", chat.data ?? "…"],
  ] as const;
  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{stats.map(([l, v]) => <div key={l} className="rounded-2xl border border-border bg-card/50 p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-1 text-3xl font-black">{v}</p></div>)}</div>
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline"><Link to="/">الرئيسية</Link></Button>
      <Button asChild variant="outline"><Link to="/movies">الأفلام</Link></Button>
      <Button asChild variant="outline"><Link to="/live-chat">الدردشة</Link></Button>
      <Button asChild variant="outline"><Link to="/vip">المكتبة</Link></Button>
    </div>
  </div>;
}

function AdsTab() {
  const { data } = useSiteConfig();
  const refresh = useRefresh();
  const [ad, setAd] = useState<SiteAd>(defaultAd);
  const [ticker, setTicker] = useState<SiteTicker>(defaultTicker);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data) { setAd(data.ad); setTicker(data.ticker); } }, [data]);
  return <form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); const a = await saveSetting("ad", ad); const b = await saveSetting("ticker", ticker); setMsg(a.error || b.error ? "تعذّر الحفظ." : "تم الحفظ ✓"); void refresh(); }}>
    <h2 className="font-black">إعلان الصفحة الرئيسية</h2>
    <label className="flex items-center gap-2"><input type="checkbox" checked={ad.enabled} onChange={(e) => setAd({ ...ad, enabled: e.target.checked })} /> إظهار الإعلان</label>
    <label className="block space-y-1"><span className="text-sm font-bold">رابط صورة الإعلان (https — اتركه فارغًا لصورة الأفلام الحالية)</span><input className={input} dir="ltr" value={ad.image} onChange={(e) => setAd({ ...ad, image: e.target.value.trim() })} /></label>
    <label className="block space-y-1"><span className="text-sm font-bold">عند الضغط يفتح (مثل /movies أو رابط كامل)</span><input className={input} dir="ltr" value={ad.link} onChange={(e) => setAd({ ...ad, link: e.target.value.trim() })} /></label>
    <h2 className="mt-4 font-black">شريط العاجل</h2>
    <label className="flex items-center gap-2"><input type="checkbox" checked={ticker.enabled} onChange={(e) => setTicker({ ...ticker, enabled: e.target.checked })} /> إظهار شريط العاجل</label>
    <textarea className={`${input} h-24 py-2`} maxLength={300} value={ticker.text} onChange={(e) => setTicker({ ...ticker, text: e.target.value })} />
    <Button type="submit">حفظ</Button>
    {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
  </form>;
}


