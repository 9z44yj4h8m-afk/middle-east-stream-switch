import { Share, PlusSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "ios-install-dismissed";

/** iPhone can't install apps from a button, so show a guided sheet pointing at Safari's share button. */
export function IosInstallBanner() {
  const [show, setShow] = useState(false);
  const [safari, setSafari] = useState(true);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!ios || standalone || window.self !== window.top) return;
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 3 * 24 * 3600 * 1000) return;
    setSafari(!/crios|fxios|edgios|instagram|fban|fbav|snapchat|line\//i.test(ua));
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  const close = () => { localStorage.setItem(KEY, String(Date.now())); setShow(false); };

  return (
    <div dir="rtl" className="fixed inset-x-0 bottom-0 z-[100] p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="relative mx-auto max-w-md rounded-2xl border border-primary/60 bg-card p-4 text-card-foreground shadow-2xl">
        <button type="button" onClick={close} aria-label="إغلاق" className="absolute left-3 top-3 rounded-full p-1 text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src="/apple-touch-icon.png" alt="" className="h-12 w-12 rounded-xl" />
          <div>
            <p className="font-black" dir="ltr">Almoghani Smarter pro</p>
            <p className="text-sm text-muted-foreground">ثبّت التطبيق على آيفونك بخطوتين</p>
          </div>
        </div>
        {safari ? (
          <ol className="mt-3 grid gap-2 text-sm">
            <li className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
              <span className="font-black text-primary">1</span> اضغط زر المشاركة <Share className="h-5 w-5 text-sky" /> بالأسفل
            </li>
            <li className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
              <span className="font-black text-primary">2</span> اختر «إضافة إلى الشاشة الرئيسية» <PlusSquare className="h-5 w-5 text-sky" />
            </li>
          </ol>
        ) : (
          <div className="mt-3 grid gap-2 text-sm">
            <p>للتثبيت افتح الموقع في متصفح Safari.</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText("https://almoghani.net/app")}
              className="rounded-lg bg-primary py-2 font-black text-primary-foreground"
            >
              نسخ الرابط لفتحه في Safari
            </button>
          </div>
        )}
        {safari && <div className="mx-auto mt-2 h-0 w-0 animate-bounce border-x-8 border-t-8 border-x-transparent border-t-primary" />}
      </div>
    </div>
  );
}
