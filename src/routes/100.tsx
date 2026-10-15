import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/components/member-provider";
import { AdminPasswordLogin } from "@/components/admin/password-login";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FEMALE_VOICE_CATEGORIES, FEMALE_VOICE_PROFILES, voiceCategory } from "@/lib/voice-config";
import { FEMALE_PROVIDERS, PANEL_COLOR_FIELDS, PANEL_TEXT_FIELDS, defaultVoicePanel, normalizeVoicePanel, type VoicePanelConfig } from "@/lib/voice-panel";

export const Route = createFileRoute("/100")({
  ssr: false,
  head: () => ({ meta: [
    { title: "لوحة خصائص الأصوات — المغني لايف" },
    { name: "description", content: "لوحة المالك لإضافة الأصوات وحذفها وتعديل تصميم ونصوص لوحة الأصوات." },
    { property: "og:title", content: "لوحة خصائص الأصوات — المغني لايف" },
    { property: "og:description", content: "إدارة أصوات ونصوص وألوان لوحة الأصوات." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PanelSettingsPage,
});

const input = "h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none";
const card = "rounded-2xl border border-border bg-card/70 p-4 space-y-3";

function PanelSettingsPage() {
  const { user, ready } = useMember();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true; setAdmin(null);
    if (user) void supabase.rpc("claim_owner_admin").then(({ data }) => { if (alive) setAdmin(!!data); });
    return () => { alive = false; };
  }, [user]);
  if (!ready) return null;
  if (!user || admin === false) return <AdminPasswordLogin />;
  if (admin === null) return <div dir="rtl" className="grid min-h-screen place-items-center">جارٍ التحقق…</div>;
  return <Editor />;
}

function Editor() {
  const [cfg, setCfg] = useState<VoicePanelConfig>(defaultVoicePanel);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [nv, setNv] = useState({ name: "", label: "", providerId: FEMALE_PROVIDERS[0]?.id ?? "Leda", delivery: "" });
  useEffect(() => {
    void supabase.from("site_settings").select("value").eq("key", "voice_panel").maybeSingle().then(({ data }) => setCfg(normalizeVoicePanel(data?.value)));
  }, []);
  async function save(next = cfg) {
    setBusy(true); setNote("");
    const clean = normalizeVoicePanel(next);
    const { error } = await supabase.from("site_settings").upsert({ key: "voice_panel", value: clean as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) setNote("تعذّر الحفظ؛ حاول مجددًا."); else { setCfg(clean); setNote("تم الحفظ ✓ — التغييرات تظهر في لوحة الأصوات"); }
  }
  const toggleHidden = (id: string) => setCfg((c) => ({ ...c, hidden: c.hidden.includes(id) ? c.hidden.filter((h) => h !== id) : [...c.hidden, id] }));
  function addVoice() {
    if (!nv.name.trim()) return;
    const id = `custom-${Math.random().toString(36).slice(2, 10)}`;
    setCfg((c) => ({ ...c, custom: [...c.custom, { id, ...nv, name: nv.name.trim() }] }));
    setNv({ ...nv, name: "", label: "", delivery: "" });
  }

  return <main dir="rtl" className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
    <header className="flex items-center justify-between gap-2">
      <h1 className="font-display text-2xl font-black text-primary">لوحة خصائص الأصوات</h1>
      <Button asChild variant="outline"><a href="/22">فتح لوحة الأصوات</a></Button>
    </header>

    <section className={card}>
      <h2 className="text-lg font-bold">إضافة صوت جديد</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="اسم الصوت" maxLength={30} value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} />
        <input className={input} placeholder="وصف قصير (اختياري)" maxLength={40} value={nv.label} onChange={(e) => setNv({ ...nv, label: e.target.value })} />
        <select className={input} aria-label="الصوت الأساسي" value={nv.providerId} onChange={(e) => setNv({ ...nv, providerId: e.target.value })}>
          {FEMALE_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <Button type="button" onClick={addVoice} disabled={!nv.name.trim()}><Plus />إضافة الصوت</Button>
      </div>
      <textarea className={`${input} h-20 py-2`} maxLength={300} placeholder="وصف النبرة: مثال «صوت ناعم هادئ بلهجة أهل الرياض»" value={nv.delivery} onChange={(e) => setNv({ ...nv, delivery: e.target.value })} />
      {cfg.custom.map((v, i) => <div key={v.id} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={input} aria-label="اسم الصوت" value={v.name} onChange={(e) => setCfg((c) => ({ ...c, custom: c.custom.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} />
        <select className={input} aria-label="الصوت الأساسي" value={v.providerId} onChange={(e) => setCfg((c) => ({ ...c, custom: c.custom.map((x, j) => j === i ? { ...x, providerId: e.target.value } : x) }))}>
          {FEMALE_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <Button variant="outline" size="icon" aria-label="حذف الصوت" onClick={() => setCfg((c) => ({ ...c, custom: c.custom.filter((x) => x.id !== v.id) }))}><Trash2 /></Button>
        <textarea className={`${input} h-16 py-2 sm:col-span-3`} aria-label="وصف النبرة" maxLength={300} value={v.delivery} onChange={(e) => setCfg((c) => ({ ...c, custom: c.custom.map((x, j) => j === i ? { ...x, delivery: e.target.value } : x) }))} />
      </div>)}
    </section>

    <section className={card}>
      <h2 className="text-lg font-bold">الأصوات الحالية (إظهار / إخفاء)</h2>
      {FEMALE_VOICE_CATEGORIES.map((cat) => <div key={cat} className="space-y-1">
        <p className="text-sm font-bold text-primary">{cat}</p>
        <div className="flex flex-wrap gap-2">{FEMALE_VOICE_PROFILES.filter((v) => voiceCategory(v.id) === cat).map((v) => {
          const off = cfg.hidden.includes(v.id);
          return <Button key={v.id} size="sm" variant={off ? "outline" : "secondary"} onClick={() => toggleHidden(v.id)} className={off ? "opacity-60 line-through" : ""}>{off ? <EyeOff /> : <Eye />}{v.name}</Button>;
        })}</div>
      </div>)}
    </section>

    <section className={card}>
      <h2 className="text-lg font-bold">نصوص اللوحة</h2>
      {PANEL_TEXT_FIELDS.map((f) => <label key={f.key} className="block space-y-1 text-sm"><span>{f.label}</span>
        <input className={input} maxLength={80} value={cfg.texts[f.key]} onChange={(e) => setCfg((c) => ({ ...c, texts: { ...c.texts, [f.key]: e.target.value } }))} /></label>)}
    </section>

    <section className={card}>
      <h2 className="text-lg font-bold">التصميم</h2>
      <label className="flex items-center justify-between text-sm"><span>إظهار صورة الشعار أعلى اللوحة</span><Switch dir="ltr" checked={cfg.showHeader} onCheckedChange={(v) => setCfg((c) => ({ ...c, showHeader: v }))} /></label>
      <label className="flex items-center justify-between text-sm"><span>تفعيل الألوان المخصصة</span><Switch dir="ltr" checked={cfg.colors.enabled} onCheckedChange={(v) => setCfg((c) => ({ ...c, colors: { ...c.colors, enabled: v } }))} /></label>
      <div className="grid grid-cols-2 gap-3">{PANEL_COLOR_FIELDS.map((f) => <label key={f.key} className="flex items-center gap-2 text-sm">
        <input type="color" aria-label={f.label} value={cfg.colors[f.key]} onChange={(e) => setCfg((c) => ({ ...c, colors: { ...c.colors, [f.key]: e.target.value } }))} className="h-10 w-12 rounded" />{f.label}</label>)}</div>
    </section>

    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-background/95 p-3">
      <Button className="flex-1" disabled={busy} onClick={() => void save()}><Save />{busy ? "جارٍ الحفظ…" : "حفظ كل التغييرات"}</Button>
      <Button variant="outline" disabled={busy} onClick={() => { if (confirm("إرجاع اللوحة للأصل؟")) void save(defaultVoicePanel); }}><RotateCcw />الأصل</Button>
    </div>
    {note && <p role="status" className="text-center text-sm font-bold">{note}</p>}
  </main>;
}
