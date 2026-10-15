import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, CreditCard, ExternalLink, MessageCircle, Save, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/components/member-provider";
import { AdminPasswordLogin } from "@/components/admin/password-login";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-account")({
  ssr: false,
  head: () => ({ meta: [
    { title: "إدارة حسابي — المغني لايف" },
    { name: "description", content: "صفحة المالك لمتابعة رصيد الأصوات وتاريخ الاشتراكات وبيانات التحويل البنكي." },
    { property: "og:title", content: "إدارة حسابي — المغني لايف" },
    { property: "og:description", content: "رصيد الأصوات والاشتراكات وبيانات الشحن." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AccountPage,
});

const input = "h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none";
const card = "rounded-2xl border border-border bg-card/70 p-4 space-y-3";
const durations: Record<string, string> = { m1: "شهر", m2: "شهرين", m3: "3 شهور" };
const statuses: Record<string, string> = { pending: "بانتظار التأكيد", active: "مفعّل", rejected: "مرفوض" };

type Bank = { bank: string; iban: string; holder: string };
type Req = { id: string; account_name: string; phone: string; duration: string; status: string; amount: number | null; receipt_name: string; created_at: string };

function AccountPage() {
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
  return <Dashboard />;
}

function Dashboard() {
  const [bank, setBank] = useState<Bank>({ bank: "", iban: "", holder: "" });
  const [reqs, setReqs] = useState<Req[]>([]);
  const [note, setNote] = useState("");

  async function load() {
    const [{ data: b }, { data: r }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "bank_details").maybeSingle(),
      supabase.from("subscription_requests").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (b?.value && typeof b.value === "object") setBank({ bank: "", iban: "", holder: "", ...(b.value as Partial<Bank>) });
    setReqs((r ?? []) as Req[]);
  }
  useEffect(() => { void load(); }, []);

  async function saveBank() {
    const { error } = await supabase.from("site_settings").upsert({ key: "bank_details", value: bank as never, updated_at: new Date().toISOString() });
    setNote(error ? "تعذّر الحفظ" : "تم حفظ بيانات البنك ✓");
  }
  async function setStatus(id: string, status: string, amount?: number | null) {
    await supabase.from("subscription_requests").update({ status, ...(amount !== undefined ? { amount } : {}) }).eq("id", id);
    void load();
  }
  async function remove(id: string) {
    if (!confirm("حذف الطلب؟")) return;
    await supabase.from("subscription_requests").delete().eq("id", id);
    void load();
  }
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); setNote("تم النسخ ✓"); };
  const active = reqs.filter((r) => r.status === "active");
  const total = active.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return <main dir="rtl" className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
    <h1 className="font-display text-2xl font-black text-primary">إدارة حسابي</h1>
    {note && <p className="text-sm text-primary">{note}</p>}

    <section className={card}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Wallet className="h-5 w-5 text-primary" />رصيد الأصوات</h2>
      <p className="text-sm text-muted-foreground">أصوات اللوحة تُولّد بالذكاء الاصطناعي من رصيد حسابك في Lovable. عند نفاد الرصيد تتحول اللوحة لنطق الجهاز تلقائيًا.</p>
      <Button asChild><a href="https://lovable.dev/settings/billing" target="_blank" rel="noreferrer"><CreditCard />شحن الرصيد الآن<ExternalLink /></a></Button>
    </section>

    <section className="grid grid-cols-3 gap-2">
      {[["كل الطلبات", reqs.length], ["مفعّلة", active.length], ["الدخل (ريال)", total]].map(([l, v]) =>
        <div key={l as string} className="rounded-2xl border border-border bg-card/70 p-3 text-center"><div className="text-2xl font-black text-primary">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}
    </section>

    <section className={card}>
      <h2 className="text-lg font-bold">تاريخ الاشتراكات</h2>
      {reqs.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات بعد — تظهر هنا تلقائيًا عند إرسال أي طلب من صفحة الاشتراك.</p>}
      <ul className="space-y-2">
        {reqs.map((r) => <li key={r.id} className="rounded-xl border border-border bg-background/40 p-3 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>{r.account_name}</b>
            <span className="rounded-full border border-primary/50 px-2 text-xs text-primary">{statuses[r.status] ?? r.status}</span>
          </div>
          <div className="text-muted-foreground">{durations[r.duration] ?? r.duration} · {r.phone} · {new Date(r.created_at).toLocaleDateString("ar-SA")}{r.receipt_name ? ` · إيصال: ${r.receipt_name}` : ""}{r.amount != null ? ` · ${r.amount} ريال` : ""}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { const a = prompt("المبلغ المستلم (ريال)", r.amount?.toString() ?? ""); if (a !== null) void setStatus(r.id, "active", a ? Number(a) || null : null); }}>تأكيد التفعيل</Button>
            <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "rejected")}>رفض</Button>
            <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^0/, "966")}`} target="_blank" rel="noreferrer"><MessageCircle />واتساب</a></Button>
            <Button size="sm" variant="ghost" aria-label="حذف" onClick={() => void remove(r.id)}><Trash2 /></Button>
          </div>
        </li>)}
      </ul>
    </section>

    <section className={card}>
      <h2 className="text-lg font-bold">بيانات التحويل البنكي</h2>
      {(["bank", "holder", "iban"] as const).map((k) => <div key={k} className="flex gap-2">
        <input className={input} placeholder={{ bank: "اسم البنك", holder: "اسم المستفيد", iban: "رقم الآيبان" }[k]} value={bank[k]} maxLength={60} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} />
        <Button type="button" variant="outline" size="icon" aria-label="نسخ" onClick={() => copy(bank[k])}><Copy /></Button>
      </div>)}
      <Button onClick={() => void saveBank()}><Save />حفظ البيانات</Button>
    </section>
  </main>;
}
