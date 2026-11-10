import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export const VOICE_PANEL_PIN = "2121";
const KEY = "voice-panel-pin-ok";

export function VoicePinGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => { setOk(sessionStorage.getItem(KEY) === "1"); }, []);
  if (ok === null) return null;
  if (ok) return <>{children}</>;
  return <main dir="rtl" className="grid min-h-screen place-items-center p-4">
    <form className="w-full max-w-xs space-y-3 rounded-2xl border border-border bg-card/70 p-5 text-center" onSubmit={(e) => {
      e.preventDefault();
      if (pin === VOICE_PANEL_PIN) { sessionStorage.setItem(KEY, "1"); setOk(true); } else { setErr(true); setPin(""); }
    }}>
      <h1 className="font-display text-xl font-black text-primary">لوحة الأصوات</h1>
      <input autoFocus inputMode="numeric" type="password" aria-label="الرقم السري" placeholder="الرقم السري" value={pin}
        onChange={(e) => { setPin(e.target.value); setErr(false); }}
        className="h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-center text-lg tracking-widest text-foreground outline-none" />
      {err && <p role="alert" className="text-sm font-bold text-destructive">الرقم السري غير صحيح</p>}
      <Button type="submit" className="w-full">دخول</Button>
    </form>
  </main>;
}
