import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { featuredChannels } from "@/lib/featured-channels";
import { useCatalog } from "@/lib/site-config";
import { Button } from "@/components/ui/button";

type Row = { id: string; channel_id: string; title: string; starts_at: string; ends_at: string | null };
const input = "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-foreground";
const localTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function ScheduleManager() {
  const catalog = useCatalog();
  const qc = useQueryClient();
  const channels = useMemo(() => Array.from(new Map([...featuredChannels.filter((c) => c.kind === "live"), ...catalog].map((c) => [c.id, { id: c.id, name: c.name }])).values()), [catalog]);
  const schedules = useQuery({ queryKey: ["channel-schedules", "admin"], queryFn: async () => {
    const { data, error } = await supabase.from("channel_schedules").select("id,channel_id,title,starts_at,ends_at").gte("starts_at", new Date(Date.now() - 86400_000).toISOString()).order("starts_at");
    if (error) throw error;
    return data;
  }, refetchInterval: 15000 });
  const [drafts, setDrafts] = useState<Record<string, Row>>({});
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = [...(schedules.data ?? []).map((r) => drafts[r.id] ?? r), ...Object.values(drafts).filter((r) => !schedules.data?.some((s) => s.id === r.id))];
  const update = (row: Row, patch: Partial<Row>) => setDrafts((d) => ({ ...d, [row.id]: { ...row, ...patch } }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const changes = Object.values(drafts);
    if (!changes.length) return setMsg("لا توجد تغييرات للحفظ.");
    const normalized: Row[] = [];
    for (const r of changes) {
      const start = new Date(r.starts_at), end = r.ends_at ? new Date(r.ends_at) : null;
      if (!r.title.trim() || !channels.some((c) => c.id === r.channel_id) || !Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end <= start))) return setMsg("أدخل القناة والعنوان ووقت البداية؛ النهاية يجب أن تكون بعد البداية.");
      normalized.push({ ...r, title: r.title.trim(), starts_at: start.toISOString(), ends_at: end?.toISOString() ?? null });
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("channel_schedules").upsert(normalized);
      if (error) throw error;
      setDrafts({}); await qc.invalidateQueries({ queryKey: ["channel-schedules"] }); setMsg(`تم حفظ ${changes.length} موعد ✓`);
    } catch { setMsg("تعذّر حفظ المواعيد؛ تغييراتك لم تُحفظ."); }
    finally { setBusy(false); }
  }
  async function remove(row: Row) {
    if (!window.confirm(`حذف موعد «${row.title || "جديد"}»؟`)) return;
    if (schedules.data?.some((r) => r.id === row.id)) {
      const { error } = await supabase.from("channel_schedules").delete().eq("id", row.id);
      if (error) return setMsg("تعذّر حذف الموعد.");
    }
    setDrafts((old) => { const next = { ...old }; delete next[row.id]; return next; });
    await qc.invalidateQueries({ queryKey: ["channel-schedules"] });
  }
  return <form onSubmit={save} className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="flex-1 font-bold">مواعيد البث</h3>
      <Button type="button" variant="outline" disabled={busy || schedules.isPending || schedules.isError} onClick={() => { const r = { id: crypto.randomUUID(), channel_id: channels[0]?.id ?? "", title: "", starts_at: "", ends_at: null }; update(r, {}); setQuery(""); }}><Plus />إضافة موعد</Button>
      <Button type="submit" disabled={busy || !Object.keys(drafts).length}><Save />{busy ? "جارٍ الحفظ…" : "حفظ جميع المواعيد"}</Button>
    </div>
    <input aria-label="بحث في المواعيد" placeholder="بحث عن قناة أو برنامج" className={input} value={query} onChange={(e) => setQuery(e.target.value)} />
    {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
    {schedules.isPending && <p>جارٍ تحميل المواعيد…</p>}
    {schedules.isError && <p role="alert" className="text-destructive">تعذّر تحميل الجدول.<Button type="button" variant="link" onClick={() => schedules.refetch()}>إعادة المحاولة</Button></p>}
    {!schedules.isPending && !schedules.isError && !rows.length && <p className="text-muted-foreground">لا توجد مواعيد مضافة.</p>}
    <fieldset disabled={busy} className="space-y-3">
      {rows.filter((r) => !query || `${r.title} ${channels.find((c) => c.id === r.channel_id)?.name ?? ""}`.includes(query)).map((r) => <div key={r.id} className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">{drafts[r.id] ? "تغييرات غير محفوظة" : "محفوظ"}</span><Button type="button" variant="ghost" size="icon" aria-label={`حذف موعد ${r.title || "جديد"}`} onClick={() => remove(r)}><Trash2 className="text-destructive" /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">القناة<select className={input} value={r.channel_id} onChange={(e) => update(r, { channel_id: e.target.value })}>{!channels.some((c) => c.id === r.channel_id) && <option value={r.channel_id}>{r.channel_id}</option>}{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="space-y-1 text-sm">اسم البرنامج أو المباراة<input required maxLength={150} className={input} value={r.title} onChange={(e) => update(r, { title: e.target.value })} /></label>
          <label className="space-y-1 text-sm">البداية<input required type="datetime-local" className={input} value={r.starts_at ? localTime(r.starts_at) : ""} onChange={(e) => update(r, { starts_at: e.target.value })} /></label>
          <label className="space-y-1 text-sm">النهاية (اختياري)<input type="datetime-local" className={input} value={r.ends_at ? localTime(r.ends_at) : ""} onChange={(e) => update(r, { ends_at: e.target.value || null })} /></label>
        </div>
      </div>)}
    </fieldset>
  </form>;
}
