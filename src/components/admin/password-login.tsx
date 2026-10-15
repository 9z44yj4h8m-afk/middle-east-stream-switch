import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loginOwner } from "@/lib/admin-login.functions";

export function AdminPasswordLogin() {
  const login = useServerFn(loginOwner);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await login({ data: { password } });
      if (!result.ok) { setError("كلمة المرور غير صحيحة أو تعذّر الدخول؛ حاول لاحقًا."); return; }
      const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (error) throw error;
      setPassword("");
    } catch { setError("تعذّر الدخول حاليًا؛ حاول مجددًا."); }
    finally { setBusy(false); }
  }
  return <main dir="rtl" className="mx-auto flex min-h-[65vh] max-w-sm flex-col justify-center px-5 py-10">
    <LockKeyhole className="mb-4 h-9 w-9 text-primary" />
    <h1 className="mb-7 text-2xl font-bold">دخول لوحة التحكم</h1>
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">كلمة المرور<input required type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-lg border border-border bg-card px-3 text-foreground" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "جارٍ الدخول…" : "دخول"}</Button>
    </form>
  </main>;
}