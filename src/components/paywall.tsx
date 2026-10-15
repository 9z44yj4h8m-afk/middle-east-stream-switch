import { Link } from "@tanstack/react-router";
import { Lock, MessageCircle } from "lucide-react";
import { CONTACT_NAME, WHATSAPP_DISPLAY, WHATSAPP_URL } from "@/lib/subscription";

export function Paywall(_props: { onHavePin?: () => void }) {
  return (
    <div dir="rtl" className="fixed inset-0 z-[70] grid place-items-center bg-background/95 p-6 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border border-primary/50 bg-surface p-6 text-center shadow-2xl">
        <Lock className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-xl font-black">انتهت المعاينة المجانية</h2>
        <p className="mt-2 text-sm text-muted-foreground">شاهدت دقيقة مجانية. للمتابعة اطلب الاشتراك.</p>
        <p className="mt-4 font-black">للاشتراك تواصل whatsapp {WHATSAPP_DISPLAY}</p>
        <p className="text-sm text-muted-foreground">{CONTACT_NAME}</p>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-black text-primary-foreground">
          <MessageCircle className="h-5 w-5" /> تواصل واتساب
        </a>
        <div className="mt-4 flex justify-center gap-4 text-sm font-bold text-muted-foreground">
          <Link to="/subscription" className="hover:text-primary">الباقات</Link>
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
