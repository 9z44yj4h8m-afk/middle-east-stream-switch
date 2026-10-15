import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download, Share, PlusSquare, Smartphone, MoreVertical, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "ثبّت تطبيق Almoghani Smarter pro — آيفون وأندرويد" },
      { name: "description", content: "طريقة تثبيت تطبيق Almoghani Smarter pro على آيفون وأندرويد خطوة بخطوة." },
      { property: "og:title", content: "تطبيق Almoghani Smarter pro" },
      { property: "og:description", content: "ثبّت التطبيق على جوالك من almoghani.net في ثوانٍ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppPage,
});

function Step({ n, icon: Icon, children }: { n: number; icon: typeof Share; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-black text-primary-foreground">{n}</span>
      <Icon className="mt-1 h-5 w-5 shrink-0 text-sky" />
      <span className="leading-7">{children}</span>
    </li>
  );
}

function AppPage() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => { e.preventDefault(); setPromptEvent(e as InstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-bold"><ArrowRight className="h-5 w-5" />ALMOGHANI LIVE</Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-10">
        <img src="/icon-192.png" alt="أيقونة التطبيق" className="mx-auto h-20 w-20 rounded-2xl shadow-lg" onError={(e) => (e.currentTarget.style.display = "none")} />
        <h1 className="mt-4 text-center font-display text-3xl font-black sm:text-4xl" dir="ltr">Almoghani Smarter pro</h1>
        <p className="mt-2 text-center text-muted-foreground">ثبّت التطبيق على جوالك ويفتح بشاشة كاملة مثل أي تطبيق.</p>

        {installed && (
          <p className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary/15 p-3 font-bold">
            <CheckCircle2 className="h-5 w-5" /> التطبيق مثبّت على جهازك
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Smartphone className="h-5 w-5 text-primary" /> أندرويد</h2>
          {promptEvent ? (
            <button
              type="button"
              onClick={async () => { await promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-black text-primary-foreground"
            >
              <Download className="h-5 w-5" /> ثبّت التطبيق الآن
            </button>
          ) : null}
          <a
            href="/download/almoghani-smarter.apk"
            download="almoghani-smarter.apk"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary/15 py-4 text-lg font-black"
          >
            <Download className="h-5 w-5" /> تحميل التطبيق (APK)
          </a>
          <p className="mb-4 text-center text-xs text-muted-foreground">بعد التحميل افتح الملف واسمح بالتثبيت من مصادر غير معروفة إذا طلب الجوال.</p>
          <p className="mb-2 text-sm font-bold">أو ثبّته من المتصفح:</p>
          <ol className="grid gap-3">
            <Step n={1} icon={Smartphone}>افتح <b dir="ltr">almoghani.net</b> في متصفح Chrome.</Step>
            <Step n={2} icon={MoreVertical}>اضغط القائمة (⋮) أعلى الشاشة.</Step>
            <Step n={3} icon={Download}>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</Step>
          </ol>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Smartphone className="h-5 w-5 text-sky" /> آيفون</h2>
          <ol className="grid gap-3">
            <Step n={1} icon={Smartphone}>افتح <b dir="ltr">almoghani.net</b> في متصفح Safari.</Step>
            <Step n={2} icon={Share}>اضغط زر المشاركة (المربع والسهم) أسفل الشاشة.</Step>
            <Step n={3} icon={PlusSquare}>اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».</Step>
          </ol>
        </section>
      </main>
    </div>
  );
}
