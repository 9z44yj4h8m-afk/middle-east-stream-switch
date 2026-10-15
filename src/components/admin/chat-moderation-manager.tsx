import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, MicOff, Mic, Eye, EyeOff, Trash2, VolumeX, Volume2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useChatBans, useChatControl, defaultChatControl, isActiveBan, type ChatControl } from "@/lib/chat-control";

const DURATIONS = [
  { label: "10 دقائق", min: 10 },
  { label: "ساعة", min: 60 },
  { label: "يوم", min: 1440 },
  { label: "دائم", min: 0 },
];

/** Admin moderation: mute/ban names, open/close mics, hide messages, pinned announcement. */
export function ChatModerationManager() {
  const qc = useQueryClient();
  const control = useChatControl().data ?? defaultChatControl;
  const bans = useChatBans().data ?? [];
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"mute" | "ban">("mute");
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState(control.announcement);
  const [msg, setMsg] = useState("");

  async function save(patch: Partial<ChatControl>) {
    const value = { ...control, ...patch };
    const { error } = await supabase.from("site_settings").upsert({ key: "chat_control", value, updated_at: new Date().toISOString() });
    setMsg(error ? "تعذّر الحفظ." : "تم الحفظ.");
    void qc.invalidateQueries({ queryKey: ["chat-control"] });
  }
  async function addBan() {
    const n = name.trim().slice(0, 40);
    if (!n) return;
    const until = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null;
    const { error } = await supabase.from("chat_bans").upsert({ name: n, kind, until, reason: reason.trim().slice(0, 120) });
    setMsg(error ? "تعذّر الحفظ." : `${kind === "ban" ? "حُظر" : "كُتم"} ${n}.`);
    setName(""); setReason("");
    void qc.invalidateQueries({ queryKey: ["chat-bans"] });
  }
  async function removeBan(n: string) {
    await supabase.from("chat_bans").delete().eq("name", n);
    void qc.invalidateQueries({ queryKey: ["chat-bans"] });
  }
  async function clearAll() {
    if (!confirm("حذف كل رسائل الدردشة؟")) return;
    const { error } = await supabase.from("chat_messages").delete().gte("created_at", "1970-01-01");
    setMsg(error ? "تعذّر الحذف." : "حُذفت كل الرسائل.");
  }

  const Toggle = ({ on, onIcon, offIcon, label, k }: { on: boolean; onIcon: React.ReactNode; offIcon: React.ReactNode; label: string; k: "hideMessages" | "micsOpen" | "voiceOpen" }) => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
      {on ? onIcon : offIcon}
      <span className="flex-1 text-sm font-bold">{label}: {on ? "مفتوح" : "مغلق"}</span>
      <Button size="sm" variant={on ? "outline" : "default"} onClick={() => void save({ [k]: k === "hideMessages" ? on : !on })}>{on ? "إغلاق" : "فتح"}</Button>
    </div>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/50 p-4" dir="rtl">
      <h3 className="font-black">إدارة الدردشة والمراقبة</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        <Toggle k="hideMessages" on={!control.hideMessages} onIcon={<Eye className="size-5" />} offIcon={<EyeOff className="size-5" />} label="ظهور الرسائل" />
        <Toggle k="voiceOpen" on={control.voiceOpen} onIcon={<Volume2 className="size-5" />} offIcon={<VolumeX className="size-5" />} label="الغرفة الصوتية" />
        <Toggle k="micsOpen" on={control.micsOpen} onIcon={<Mic className="size-5" />} offIcon={<MicOff className="size-5" />} label="مايكات الزوار" />
      </div>
      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm font-bold"><Megaphone className="size-4" />إعلان مثبت أعلى الدردشة</label>
        <div className="flex gap-2"><input className="member-screen-input h-10" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="مثال: نورتوا شات المغني" /><Button onClick={() => void save({ announcement: note.trim() })}>حفظ</Button></div>
      </div>
      <div className="grid gap-2 rounded-xl border border-border p-3">
        <b className="text-sm">كتم أو حظر عضو (بالاسم المستعار)</b>
        <div className="grid gap-2 sm:grid-cols-4">
          <input className="member-screen-input h-10" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <select className="member-screen-input h-10" value={kind} onChange={(e) => setKind(e.target.value as "mute" | "ban")}><option value="mute">كتم (لا يكتب)</option><option value="ban">حظر (لا يدخل)</option></select>
          <select className="member-screen-input h-10" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{DURATIONS.map((d) => <option key={d.min} value={d.min}>{d.label}</option>)}</select>
          <input className="member-screen-input h-10" placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
        </div>
        <Button onClick={() => void addBan()} disabled={!name.trim()}><Ban />تطبيق</Button>
        <ul className="divide-y divide-border">
          {bans.filter(isActiveBan).map((b) => <li key={b.name} className="flex items-center gap-2 py-2 text-sm"><span className="flex-1"><b>{b.name}</b> — {b.kind === "ban" ? "محظور" : "مكتوم"} {b.until ? `حتى ${new Date(b.until).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}` : "نهائيًا"}{b.reason && ` (${b.reason})`}</span><Button size="sm" variant="outline" onClick={() => void removeBan(b.name)}>إلغاء</Button></li>)}
          {!bans.filter(isActiveBan).length && <li className="py-2 text-sm text-muted-foreground">لا يوجد أعضاء مكتومون أو محظورون.</li>}
        </ul>
      </div>
      <Button variant="destructive" onClick={() => void clearAll()}><Trash2 />حذف كل الرسائل</Button>
      {msg && <p className="text-sm" role="status">{msg}</p>}
    </section>
  );
}
