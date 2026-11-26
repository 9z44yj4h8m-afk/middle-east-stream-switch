import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/components/member-provider";
import { AdminPasswordLogin } from "@/components/admin/password-login";

export function VoicePinGate({ children }: { children: ReactNode }) {
  const { user, ready } = useMember();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    setAdmin(null);
    if (!user) {
      setAdmin(false);
      return;
    }
    void supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => { if (alive) setAdmin(data === true); });
    return () => { alive = false; };
  }, [user?.id]);
  if (!ready || (user && admin === null)) {
    return <div dir="rtl" className="grid min-h-screen place-items-center text-sm text-muted-foreground">جارٍ التحقق…</div>;
  }
  if (!user || admin !== true) return <AdminPasswordLogin />;
  return <>{children}</>;
}
