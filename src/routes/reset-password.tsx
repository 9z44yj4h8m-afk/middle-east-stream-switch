import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [{ title: "استعادة كلمة المرور — المغني لايف" }, { name: "description", content: "عيّن كلمة مرور جديدة لحساب المغني." }, { property: "og:title", content: "استعادة كلمة المرور — المغني لايف" }, { property: "og:description", content: "إعادة تعيين كلمة مرور العضو." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: ResetPassword });
function ResetPassword() {
  const [valid, setValid] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") setValid(true);
    // Auth client removes the hash after consuming the recovery link. This marker
    // permits a reload of the recovery page, never grants an authenticated session.
    if (sessionStorage.getItem("password-recovery") === "active") setValid(true);
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") { setValid(true); sessionStorage.setItem("password-recovery", "active"); } });
    if (hash.get("type") === "recovery") sessionStorage.setItem("password-recovery", "active");
    return () => data.subscription.unsubscribe();
  }, []);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6" dir="rtl"><h1 className="text-2xl font-black">كلمة مرور جديدة</h1>{!valid ? <p className="mt-4 text-muted-foreground">افتح رابط الاستعادة المرسل إلى بريدك.</p> : <form className="mt-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); if (password !== confirm) { setMessage("كلمتا المرور غير متطابقتين."); return; } setBusy(true); const result = await supabase.auth.updateUser({ password }); setBusy(false); if (result.error) setMessage("تعذّر تغيير كلمة المرور؛ اطلب رابط استعادة جديدًا."); else { sessionStorage.removeItem("password-recovery"); setValid(false); setMessage("تم تغيير كلمة المرور."); } }}><label className="block">كلمة المرور<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-surface px-3" /></label><label className="block">تأكيد كلمة المرور<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-surface px-3" /></label><Button type="submit" disabled={busy} className="w-full">حفظ كلمة المرور</Button></form>}{message && <p role="status" className="mt-4 text-sm">{message}</p>}<Button asChild variant="outline" className="mt-5"><Link to="/auth">العودة إلى الدخول</Link></Button></main>;
}