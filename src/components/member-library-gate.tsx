import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole, LogOut, Pause, ArrowRight } from "lucide-react";
import { useMember } from "./member-provider";
import { Button } from "./ui/button";
import { InstallAppButton } from "./install-app-button";
import { getMemberAccess, unlockMemberLibrary, lockMemberLibrary } from "@/lib/member.functions";
import { supabase } from "@/integrations/supabase/client";
import satelliteWorld from "@/assets/satellite-world.jpg";
import satelliteMark from "@/assets/satellite-mark.jpg";

export function MemberLibraryGate({ children }: { children: ReactNode }) {
  const { user, ready } = useMember();
  const status = useServerFn(getMemberAccess);
  const unlock = useServerFn(unlockMemberLibrary);
  const lock = useServerFn(lockMemberLibrary);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locallyLocked, setLocallyLocked] = useState(false);
  const [pinOk, setPinOk] = useState(false);
  useEffect(() => { setPinOk(!!user && sessionStorage.getItem("library-pin-ok") === user.id); }, [user?.id]);
  const access = useQuery({ queryKey: ["member-access", user?.id], queryFn: () => status(), enabled: ready && !!user, staleTime: 0, retry: false });
  async function signOut() {
    setLocallyLocked(true); sessionStorage.removeItem("library-pin-ok");
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  async function pause() {
    setLocallyLocked(true); setPin(""); setPinOk(false); sessionStorage.removeItem("library-pin-ok");
    await queryClient.cancelQueries();
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "member-access" });
    try { await lock(); await access.refetch(); }
    catch { setError("تعذّر حفظ القفل؛ أعد المحاولة أو سجّل الخروج."); }
  }
  const enteredAt = access.data?.enteredAt;
  const memberBar = <div className="border-b border-border bg-surface px-4 py-3" dir="rtl"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{access.data?.name}</p><p className="text-xs text-muted-foreground">{enteredAt ? `تاريخ الدخول: ${new Date(enteredAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}` : "جلسة عضو"}</p></div><div className="flex items-center gap-2"><InstallAppButton />{access.data?.unlocked && !locallyLocked && <Button variant="outline" size="sm" onClick={pause}><Pause className="h-4 w-4" />قفل جلستي</Button>}<Button variant="ghost" size="icon" title="تسجيل الخروج" aria-label="تسجيل الخروج" onClick={signOut}><LogOut className="h-4 w-4" /></Button></div></div></div>;
  if (ready && user && access.data?.unlocked && pinOk && !locallyLocked) return <>{memberBar}{children}</>;
  return <div className="relative min-h-screen bg-background text-foreground" dir="rtl">
    <img src={satelliteWorld} width={1536} height={1024} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
    <div className="relative">{user && memberBar}<main className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-6 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"><ArrowRight className="h-4 w-4" />الرئيسية</Link>
      <img src={satelliteMark} width={1024} height={1024} alt="ALMOGHANI" className="mb-6 h-20 w-20 rounded-lg" />
      <h1 className="font-display text-3xl font-black">Almoghani Smarter pro</h1>
      {!ready || (user && access.isPending) ? <p className="mt-5 text-muted-foreground">جارٍ التحقق من الدخول…</p> : !user ? <><p className="mt-3 text-muted-foreground">دخول الأعضاء</p><Button asChild size="lg" className="mt-6"><Link to="/auth" onClick={() => sessionStorage.setItem("member-destination", window.location.pathname + window.location.search)}>تسجيل الدخول</Link></Button></> : <form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const result = await unlock({ data: { pin } }); if (!result.ok) { setError("رقم سري خاطئ"); setPin(""); } else { await access.refetch(); if (user) sessionStorage.setItem("library-pin-ok", user.id); setPinOk(true); setLocallyLocked(false); setPin(""); } } catch { setError("تعذّر فتح المكتبة، أعد المحاولة."); } finally { setBusy(false); } }}>
        <p className="flex items-center gap-2 font-bold"><LockKeyhole className="h-5 w-5 text-primary" />{locallyLocked ? "الجلسة مقفلة مؤقتًا" : "أدخل رمز المكتبة"}</p>
        <label className="block"><span className="sr-only">الرقم السري</span><input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} autoComplete="off" aria-label="الرقم السري" className="h-14 w-full rounded-md border border-input bg-surface px-4 text-center text-2xl text-foreground outline-none focus:border-primary" /></label>
        {(error || access.isError) && <p role="alert" className="text-sm text-destructive">{error || "تعذّر التحقق من حسابك."}</p>}
        <Button type="submit" size="lg" disabled={busy || pin.length !== 4} className="w-full">{busy ? "جارٍ التحقق…" : locallyLocked ? "استئناف الدخول" : "فتح المكتبة"}</Button>
      </form>}
    </main></div>
  </div>;
}