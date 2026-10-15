import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Save, Send, Smile, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatAppearanceStyle } from "@/components/chat-appearance-style";
import { chatColors, chatSizes, chatIconChoices, defaultChatAppearance, normalizeChatAppearance, type ChatAppearance } from "@/lib/chat-appearance";
import { useSiteConfig, siteConfigKey } from "@/lib/site-config";
import { supabase } from "@/integrations/supabase/client";
import roses from "@/assets/chat-roses.jpg";

const field = "h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-foreground";
export function ChatAppearanceEditor() {
  const { data, isPending } = useSiteConfig();
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<ChatAppearance>(defaultChatAppearance);
  const [icon, setIcon] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => { if (data) setCfg(data.chatAppearance); }, [data]);
  function update(patch: Partial<ChatAppearance>) { setCfg((c) => ({ ...c, ...patch })); setNote(""); }
  async function save() {
    setBusy(true); setNote("");
    try {
      const next = normalizeChatAppearance(cfg);
      const { error } = await supabase.from("site_settings").upsert({ key: "chat-appearance", value: JSON.parse(JSON.stringify(next)), updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: siteConfigKey });
      setNote("تم حفظ مظهر الشات ✓");
    } catch { setNote("تعذّر الحفظ؛ حاول مجددًا."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 border-y border-border py-6" aria-label="مظهر الشات وأيقوناته">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">مظهر الشات وأيقوناته</h2><Button type="button" disabled={busy || isPending} onClick={save}><Save />{busy ? "جارٍ الحفظ…" : "حفظ مظهر الشات"}</Button></div>
    <fieldset disabled={busy || isPending} className="grid gap-4 sm:grid-cols-2">
      {chatSizes.filter((f) => f.key === "frameHeight" || f.key === "frameWidth").map((f) => <label key={f.key} className="space-y-2">
        <span className="block font-bold">{f.label}</span>
        <input type="number" aria-label={`${f.label} بالرقم`} min={f.min} max={f.max} value={cfg[f.key]} onChange={(e) => { const value = e.target.valueAsNumber; if (Number.isFinite(value)) update({ [f.key]: value }); }} onBlur={() => setCfg((c) => normalizeChatAppearance(c))} className={field} />
        <input type="range" aria-label={f.label} min={f.min} max={f.max} value={cfg[f.key]} onChange={(e) => update({ [f.key]: Number(e.target.value) })} className="w-full accent-primary" />
      </label>)}
    </fieldset>
    <ChatAppearanceStyle config={cfg} scope=".chat-editor-preview" />
    <div className="chat-editor-preview classic-chat" aria-label="معاينة مظهر الشات">
      <div className="classic-chat-frame">
        <div className="classic-chat-masthead" dir="ltr"><img src={roses} alt="" width={1152} height={576} /><h2>ALMOGHANI <span>LIVE</span></h2><img src={roses} alt="" width={1152} height={576} /></div>
        <div className="classic-chat-workspace">
          <div className="classic-chat-messages"><div className="classic-chat-message"><span className="classic-chat-avatar">{cfg.avatarIcon === "default" ? "أ" : cfg.avatarIcon}</span><div><p className="classic-chat-message-meta"><b>أحمد</b></p><p className="classic-chat-body">السلام عليكم، حيّاكم الله 🌹</p></div></div><div className="classic-chat-message"><span className="classic-chat-avatar">{cfg.avatarIcon === "default" ? "م" : cfg.avatarIcon}</span><div><p className="classic-chat-message-meta"><b>المغني</b></p><p className="classic-chat-body">وعليكم السلام، نورت الدردشة!</p></div></div></div>
          <aside className="classic-chat-sidebar"><b>المستخدمون</b><div className="classic-chat-people"><p className="p-3">أحمد</p><p className="p-3">المغني</p></div></aside>
        </div>
        <div className="classic-chat-actions mt-2 flex"><Button type="button" variant="secondary" className="classic-chat-control">{cfg.sendIcon === "default" ? <Send /> : cfg.sendIcon}إرسال</Button><Button type="button" variant="secondary" className="classic-chat-control" aria-label="معاينة أيقونة الرموز">{cfg.smileIcon === "default" ? <Smile /> : cfg.smileIcon}</Button></div>
      </div>
    </div>
    <fieldset disabled={busy || isPending} className="space-y-6">
      <div className="flex flex-wrap gap-5">{([{ key: "showRoses", label: "إظهار الورود" }, { key: "showSidebar", label: "إظهار قائمة الأسماء" }, { key: "showAvatars", label: "إظهار صور الأسماء" }] as const).map((f) => <label key={f.key} className="flex items-center gap-2"><input type="checkbox" checked={cfg[f.key]} onChange={(e) => update({ [f.key]: e.target.checked })} />{f.label}</label>)}</div>
      <div className="grid gap-5 sm:grid-cols-2">{chatSizes.filter((f) => f.key !== "frameHeight" && f.key !== "frameWidth" && f.key !== "height").map((f) => <label key={f.key} className="space-y-2"><span className="flex justify-between gap-3 text-sm font-bold">{f.label}<span>{cfg[f.key]} px</span></span><input type="range" aria-label={f.label} min={f.min} max={f.max} value={cfg[f.key]} onChange={(e) => update({ [f.key]: Number(e.target.value) })} className="w-full accent-primary" /></label>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">{chatColors.map((f) => <label key={f.key} className="flex items-center gap-3"><input type="color" aria-label={f.label} value={cfg[f.key]} onChange={(e) => update({ [f.key]: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-border" /><span className="text-sm font-bold">{f.label}</span></label>)}</div>
      <div className="grid gap-4 sm:grid-cols-3">{([{ key: "sendIcon", label: "أيقونة الإرسال" }, { key: "smileIcon", label: "أيقونة زر الرموز" }, { key: "avatarIcon", label: "أيقونة الأسماء" }] as const).map((f) => <label key={f.key} className="space-y-2"><span className="text-sm font-bold">{f.label}</span><select className={field} value={cfg[f.key]} onChange={(e) => update({ [f.key]: e.target.value })}>{[...new Set([...chatIconChoices, ...cfg.emojis])].map((s) => <option key={s} value={s}>{s === "default" ? "الأصلية" : s}</option>)}</select></label>)}</div>
      <div className="space-y-3"><h3 className="font-bold">إضافة رموز وأيقونات</h3><div className="flex gap-2"><input className={field} aria-label="رمز جديد" placeholder="الصق رمزًا مثل 🌹 أو 👑" maxLength={16} value={icon} onChange={(e) => setIcon(e.target.value)} /><Button type="button" disabled={!icon.trim() || cfg.emojis.length >= 40} onClick={() => { update({ emojis: normalizeChatAppearance({ ...cfg, emojis: [...cfg.emojis, icon.trim()] }).emojis }); setIcon(""); }}><Plus />إضافة</Button></div><div className="flex flex-wrap gap-2">{cfg.emojis.map((s) => <div key={s} className="flex items-center gap-1 rounded border border-border px-2 py-1"><span className="text-xl">{s}</span><Button type="button" variant="ghost" size="icon-xs" aria-label={`حذف الرمز ${s}`} title={`حذف ${s}`} onClick={() => update({ emojis: cfg.emojis.filter((e) => e !== s) })}><Trash2 /></Button></div>)}</div></div>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={save}><Save />حفظ مظهر الشات</Button><Button type="button" variant="outline" onClick={() => { setCfg(defaultChatAppearance); setNote("أُعيد المظهر الأصلي في المعاينة؛ احفظ لتطبيقه."); }}><RotateCcw />استعادة المظهر الأصلي</Button></div>
    </fieldset>
    {note && <p role="status" className="text-sm text-sky">{note}</p>}
  </section>;
}