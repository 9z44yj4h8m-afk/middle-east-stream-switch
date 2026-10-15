import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/** "Install app" button: native prompt on Android/Chrome, instructions on iPhone. */
export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const inFrame = window.self !== window.top;
    setInstalled(standalone || inFrame);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const label = (
    <>
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">ثبّت التطبيق</span>
    </>
  );
  const cls =
    "flex h-10 items-center gap-2 rounded-lg border border-primary/70 bg-primary/15 px-3 text-sm font-bold text-foreground";

  if (promptEvent) {
    return (
      <button
        type="button"
        className={cls}
        aria-label="ثبّت التطبيق"
        onClick={async () => {
          await promptEvent.prompt();
          await promptEvent.userChoice;
          setPromptEvent(null);
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <Link to="/app" className={cls} aria-label="ثبّت التطبيق">
      {label}
    </Link>
  );
}
