import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { checkStreamUrl } from "@/lib/admin.functions";
import { channelCategories, siteConfigKey } from "@/lib/site-config";

const input = "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-foreground";
const newRow = () => ({ id: `c-${crypto.randomUUID()}`, name: "", category: "عامة", url: "", logo: "" });

export function ContentManager() {
  return <div className="space-y-4">
    <h2 className="text-xl font-bold">إدارة المحتوى</h2>
    <BulkChannels />
  </div>;
}

function BulkChannels() {
  const [rows, setRows] = useState(() => [newRow()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const check = useServerFn(checkStreamUrl);
  const qc = useQueryClient();
  const update = (id: string, key: string, value: string) => setRows((old) => old.map((r) => r.id === id ? { ...r, [key]: value } : r));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setErrors({});
    try {
      const failures: Record<string, string> = {};
      // Bounded batches keep verification responsive without flooding stream hosts.
      for (let i = 0; i < rows.length; i += 4) {
        await Promise.all(rows.slice(i, i + 4).map(async (r) => {
          if (!r.name.trim() || !r.url.trim()) { failures[r.id] = "أدخل الاسم ورابط البث."; return; }
          if (r.logo && !/^https:\/\//.test(r.logo)) { failures[r.id] = "رابط الشعار يجب أن يبدأ بـ https."; return; }
          try { const result = await check({ data: { url: r.url.trim() } }); if (!result.ok) failures[r.id] = result.reason; }
          catch { failures[r.id] = "تعذّر فحص الرابط؛ حاول مجددًا."; }
        }));
      }
      if (Object.keys(failures).length) { setErrors(failures); setMessage("لم تُحفظ القنوات؛ صحّح الروابط المحددة."); return; }
      const { error } = await supabase.from("custom_channels").insert(rows.map((r) => ({ id: r.id, name: r.name.trim(), category: r.category, stream_url: r.url.trim(), logo: r.logo.trim() })));
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: siteConfigKey });
      setMessage(`تمت إضافة ${rows.length} قناة ✓`); setRows([newRow()]);
    } catch { setMessage("تعذّر حفظ القنوات؛ لم تتم الإضافة."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4">
    <fieldset disabled={busy} className="space-y-3">
      {rows.map((r, i) => <div key={r.id} className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">قناة {i + 1}</h3><Button type="button" size="icon" variant="ghost" disabled={rows.length === 1} aria-label={`حذف صف القناة ${i + 1}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}><Trash2 /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">اسم القناة<input className={input} required maxLength={80} value={r.name} onChange={(e) => update(r.id, "name", e.target.value)} /></label>
          <label className="space-y-1 text-sm">القسم<select className={input} value={r.category} onChange={(e) => update(r.id, "category", e.target.value)}>{channelCategories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="space-y-1 text-sm">رابط البث<input type="url" dir="ltr" className={input} required maxLength={1000} value={r.url} onChange={(e) => update(r.id, "url", e.target.value)} /></label>
          <label className="space-y-1 text-sm">رابط الشعار (اختياري)<input type="url" dir="ltr" className={input} maxLength={1000} value={r.logo} onChange={(e) => update(r.id, "logo", e.target.value)} /></label>
        </div>
        {errors[r.id] && <p role="alert" className="mt-2 text-sm text-destructive">{errors[r.id]}</p>}
      </div>)}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={rows.length >= 50} onClick={() => setRows([...rows, newRow()])}><Plus />إضافة صف</Button><Button type="submit"><Save />{busy ? "جارٍ الفحص والحفظ…" : "فحص وحفظ جميع القنوات"}</Button></div>
    </fieldset>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </form>;
}