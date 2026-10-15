import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, UserRound, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMember } from "@/components/member-provider";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { notifyOwnerNewMember } from "@/lib/member.functions";
import loginArtwork from "@/assets/member-screen/login-art.jpg.asset.json";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { MemberPlatforms } from "@/components/member-platforms";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "دخول الأعضاء — المغني لايف" }, { name: "description", content: "حسابك الشخصي للدخول إلى مكتبة المغني الخاصة." }, { property: "og:title", content: "دخول الأعضاء — المغني لايف" }, { property: "og:description", content: "دخول الأعضاء وإنشاء حساب شخصي." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, ready } = useMember();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    if (!ready || !user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") || window.location.hash.includes("error")) return;
    void supabase.rpc("ensure_member_profile").then(({ error: profileError }) => {
      if (profileError) { setError("تعذّر حفظ بيانات العضو؛ أعد المحاولة."); return; }
      void notifyOwnerNewMember().catch(() => {});
      const destination = sessionStorage.getItem("member-destination");
      sessionStorage.removeItem("member-destination");
      if (destination?.startsWith("/vip") && !destination.startsWith("//")) {
        const url = new URL(destination, window.location.origin);
        void navigate({ to: "/vip", search: { kind: url.searchParams.get("kind") ?? undefined, group: url.searchParams.get("group") ?? undefined, q: url.searchParams.get("q") ?? undefined } });
      }
    });
  }, [user?.id, ready, navigate]);
  const inputClass = "member-screen-input";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const result = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } });
        if (result.error) throw result.error;
        setMessage(result.data.session ? "تم إنشاء الحساب." : "تحقق من بريدك لتأكيد حسابك ثم سجّل الدخول.");
      } else if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setMessage("إذا كان البريد مسجلًا ستصلك رسالة استعادة كلمة المرور.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
    } catch { setError(mode === "login" ? "تعذّر الدخول؛ تحقق من البريد وكلمة المرور وتأكيد حسابك." : "تعذّر إتمام الطلب؛ تحقق من البيانات وحاول مجددًا."); }
    finally { setBusy(false); }
  }
  return <div className="member-studio-page" dir="rtl">
    <main className="member-studio-layout">
      <section className="member-login-screen">
        <img src={loginArtwork.url} alt="ALMOGHANI LIVE — دخول الأعضاء" className="member-studio-art" />
        <div className="member-login-body">
          <h1 className="text-center text-3xl font-black">{mode === "signup" ? "إنشاء حساب" : mode === "forgot" ? "استعادة كلمة المرور" : "تسجيل الدخول"}</h1>
          <p className="mt-2 text-center text-lg text-muted-foreground">مرحبًا بعودتك</p>
          {user ? <p role="status" className="member-form mt-6 text-center font-bold text-sky">تم تسجيل الدخول</p> : <form onSubmit={submit} className="member-form mt-6 space-y-5">
            {mode === "signup" && <label className="block space-y-2"><span className="flex items-center gap-2 font-bold"><UserRound className="h-5 w-5" />اسم العضو</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} minLength={2} required autoComplete="name" placeholder="أدخل اسم العضو" /></label>}
            <label className="block space-y-2"><span className="flex items-center gap-2 font-bold"><UserRound className="h-5 w-5" />البريد الإلكتروني</span><input type="email" dir="ltr" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="أدخل البريد الإلكتروني" /></label>
            {mode !== "forgot" && <label className="block space-y-2"><span className="flex items-center gap-2 font-bold"><LockKeyhole className="h-5 w-5" />كلمة المرور</span><div className="relative"><input type={showPassword ? "text" : "password"} className={`${inputClass} pl-12`} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="كلمة المرور" /><Button type="button" size="icon" variant="ghost" className="absolute left-2 top-3" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></label>}
            {error && <p role="alert" className="text-sm text-signal">{error}</p>}{message && <p role="status" className="text-sm text-sky">{message}</p>}
            <Button type="submit" size="lg" disabled={busy} className="member-red-action w-full">{busy ? "جارٍ الإرسال…" : mode === "signup" ? "إنشاء الحساب" : mode === "forgot" ? "إرسال رابط الاستعادة" : "تسجيل الدخول"}</Button>
            {mode !== "forgot" && <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` }); if (result.error) setError("تعذّر الدخول عبر Google."); } catch { setError("تعذّر الدخول عبر Google."); } finally { setBusy(false); } }}>المتابعة باستخدام Google</Button>}
            <div className="flex flex-wrap justify-center gap-2"><Button type="button" variant="link" className="text-sky" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "لدي حساب" : "إنشاء حساب"}</Button><Button type="button" variant="link" className="text-sky" onClick={() => { setMode(mode === "forgot" ? "login" : "forgot"); setError(""); setMessage(""); }}>{mode === "forgot" ? "العودة للدخول" : "نسيت كلمة المرور؟"}</Button></div>
          </form>}
          <Button asChild variant="link" className="mx-auto mt-6 flex text-muted-foreground"><Link to="/"><Home />العودة للرئيسية</Link></Button>
        </div>
      </section>
      <section aria-label="شاشة ALMOGHANI AI" className="member-chat-area"><AiChatPanel embedded /></section>
    </main>
    <MemberPlatforms />
  </div>;
}
