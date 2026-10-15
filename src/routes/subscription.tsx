import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight, Banknote, Calendar, CalendarDays, CalendarRange, CreditCard,
  Send, UploadCloud, User, Phone, Wallet,
} from "lucide-react";
import subHeader from "@/assets/subscription-request-header.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "طلب الاشتراك — المغني لايف" },
      { name: "description", content: "أرسل طلب اشتراك في ALMOGHANI VOICE: اختر المدة والحساب وطريقة الدفع، ويصلك الرد على واتساب." },
      { property: "og:title", content: "طلب الاشتراك — المغني لايف" },
      { property: "og:description", content: "اختر مدة الاشتراك وأرسل طلبك مباشرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscriptionRequestPage,
});

const durations = [
  { id: "m1", label: "شهر", color: "cyan", icon: Calendar },
  { id: "m2", label: "شهرين", color: "purple", icon: CalendarDays },
  { id: "m3", label: "3 شهر", color: "gold", icon: CalendarRange },
] as const;

const durationLabel: Record<string, string> = { m1: "شهر واحد", m2: "شهرين", m3: "3 شهور" };

function SubscriptionRequestPage() {
  const [duration, setDuration] = useState<string>("m3");
  const [payment, setPayment] = useState<string>("bank");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!name.trim() || !phone.trim()) {
      setError("اكتب اسم الحساب ورقم الجوال أول");
      return;
    }
    setError("");
    const lines = [
      "طلب اشتراك ALMOGHANI VOICE",
      `المدة: ${durationLabel[duration] ?? duration}`,
      `اسم الحساب: ${name.trim()}`,
      `رقم الجوال: ${phone.trim()}`,
      `طريقة الدفع: ${payment === "bank" ? "تحويل بنكي" : "طريقة أخرى"}`,
    ];
    if (receiptName) lines.push(`إيصال الدفع: ${receiptName} (سأرفقه هنا)`);
    void supabase.from("subscription_requests").insert({
      account_name: name.trim().slice(0, 80), phone: phone.trim().slice(0, 30), duration,
      payment, receipt_name: receiptName.slice(0, 200),
    });
    window.open("https://wa.me/966557073007?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noreferrer");
  }

  return (
    <div dir="rtl" className="subreq-page min-h-screen pb-6">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
          <Link to="/" className="icon-button shrink-0" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></Link>
          <h1 className="text-lg font-black text-primary">طلب الاشتراك</h1>
        </div>
      </header>
      <div className="subreq-wrap">
        <div className="subreq-header">
          <img src={subHeader.url} alt="ALMOGHANI VOICE — طلب الاشتراك" />
        </div>

        <section className="subreq-section">
          <h2 className="subreq-title"><CalendarDays />مدة الاشتراك</h2>
          <div className="subreq-plans" role="radiogroup" aria-label="مدة الاشتراك">
            {durations.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={duration === d.id}
                data-color={d.color}
                data-checked={duration === d.id}
                className="subreq-plan"
                onClick={() => setDuration(d.id)}
              >
                <d.icon />
                <span className="subreq-plan-name">{d.label}</span>
                <span className="subreq-plan-price">المبلغ: ______ ريال</span>
              </button>
            ))}
          </div>
        </section>

        <section className="subreq-section subreq-cyan">
          <h2 className="subreq-title"><User />الحساب</h2>
          <div className="mt-3 space-y-3">
            <div className="subreq-field">
              <User />
              <input className="subreq-input" placeholder="اسم الحساب" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="subreq-field">
              <Phone />
              <input className="subreq-input" type="tel" inputMode="tel" placeholder="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="subreq-section subreq-gold">
          <h2 className="subreq-title"><CreditCard />الدفع</h2>
          <div className="subreq-pay" role="radiogroup" aria-label="طريقة الدفع">
            <button type="button" role="radio" aria-checked={payment === "bank"} data-color="cyan" data-checked={payment === "bank"} className="subreq-payopt" onClick={() => setPayment("bank")}>
              <Banknote />تحويل بنكي
            </button>
            <button type="button" role="radio" aria-checked={payment !== "bank"} data-color="purple" data-checked={payment !== "bank"} className="subreq-payopt" onClick={() => setPayment("other")}>
              <Wallet />طريقة أخرى
            </button>
          </div>
          <button type="button" className="subreq-upload" onClick={() => fileRef.current?.click()}>
            <UploadCloud />
            {receiptName ? receiptName : "إرفاق إيصال الدفع"}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" aria-label="إرفاق إيصال الدفع"
            onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? "")} />
        </section>

        {error ? <p className="subreq-error">{error}</p> : null}

        <button type="button" className="subreq-submit" onClick={submit}>
          <Send />إرسال طلب الاشتراك
        </button>
      </div>
    </div>
  );
}
