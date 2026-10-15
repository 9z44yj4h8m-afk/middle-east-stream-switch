import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function ChatRoomsManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const rooms = useQuery({ queryKey: ["chat-rooms"], queryFn: async () => {
    const { data, error } = await supabase.from("chat_rooms").select("id,name").order("created_at");
    if (error) throw error;
    return data ?? [];
  } });
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNote("");
    const { error } = await supabase.rpc("create_chat_room", { p_name: name.trim() });
    setBusy(false);
    setNote(error ? "تعذّر إنشاء الغرفة؛ تأكد من عدم تكرار الاسم وحاول مجددًا." : "تم إنشاء الغرفة ✓");
    if (!error) { setName(""); await qc.invalidateQueries({ queryKey: ["chat-rooms"] }); }
  }
  const [who, setWho] = useState(""); const [target, setTarget] = useState("");
  async function move(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNote("");
    const { error } = await supabase.from("chat_room_moves").upsert({ name: who.trim(), room_id: target || null, moved_at: new Date().toISOString() });
    setBusy(false); setNote(error ? "تعذّر نقل العضو." : `تم نقل «${who.trim()}» ✓ — ينتقل تلقائيًا خلال ثوانٍ.`);
    if (!error) setWho("");
  }
  async function remove(id: string) {
    if (!window.confirm("حذف الغرفة وجميع رسائلها؟")) return;
    setBusy(true);
    const { error } = await supabase.from("chat_rooms").delete().eq("id", id);
    setBusy(false); setNote(error ? "تعذّر حذف الغرفة." : "تم حذف الغرفة ✓");
    if (!error) await qc.invalidateQueries({ queryKey: ["chat-rooms"] });
  }
  return <section aria-label="إدارة الغرف" className="space-y-4 border-y border-border py-6">
    <h3 className="text-xl font-black">الغرف · إضافة وحذف</h3>
    <form onSubmit={add} className="flex flex-wrap gap-2">
      <input aria-label="اسم الغرفة الجديدة" className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3" minLength={2} maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الغرفة الجديدة" />
      <Button disabled={busy || name.trim().length < 2} type="submit"><Plus />إضافة غرفة</Button>
    </form>
    <p className="border-b border-border py-2 font-bold">الغرفة العامة</p>
    {rooms.isError && <p role="alert">تعذّر تحميل الغرف.</p>}
    <ul className="divide-y divide-border">{rooms.data?.map((r) => <li key={r.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1 break-words font-bold">{r.name}</span><Button disabled={busy} variant="outline" size="icon" aria-label={`حذف غرفة ${r.name}`} onClick={() => void remove(r.id)}><Trash2 /></Button></li>)}</ul>
    <form onSubmit={move} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <h4 className="font-black sm:col-span-3">نقل عضو إلى غرفة أخرى</h4>
      <input aria-label="اسم العضو في الشات" className="h-11 rounded-lg border border-border bg-background px-3" required maxLength={30} value={who} onChange={(e) => setWho(e.target.value)} placeholder="اسم العضو كما يظهر في الشات" />
      <select aria-label="الغرفة الهدف" className="h-11 rounded-lg border border-border bg-background px-3" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">الغرفة العامة</option>{rooms.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <Button disabled={busy || !who.trim()} type="submit">نقل</Button>
    </form>
    {note && <p role="status">{note}</p>}
  </section>;
}