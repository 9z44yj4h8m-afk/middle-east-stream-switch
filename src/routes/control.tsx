import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMember } from "@/components/member-provider";
import { AdminPasswordLogin } from "@/components/admin/password-login";
import { EasyChannelPanel } from "@/components/admin/easy-channel-panel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/control")({
  ssr: false,
  head: () => ({ meta: [
    { title: "لوحة القنوات السهلة — ALMOGHANI LIVE" },
    { name: "description", content: "لوحة مالك المغني لايف لإدارة القنوات واستيراد ملفات M3U." },
    { property: "og:title", content: "لوحة القنوات السهلة — ALMOGHANI LIVE" },
    { property: "og:description", content: "إدارة واستيراد وتعديل قنوات المغني لايف." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: ControlPage,
});

function ControlPage() {
  const { user, ready } = useMember();
  const [checked, setChecked] = useState<{ userId: string; admin: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    if (user) void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data, error }) => { if (active) setChecked({ userId: user.id, admin: !error && data === true }); });
    return () => { active = false; };
  }, [user]);
  if (!ready || (user && checked?.userId !== user.id)) return <div className="owner-panel grid min-h-dvh place-items-center" role="status">جارٍ التحقق…</div>;
  if (!user || !checked?.admin) return <div className="owner-panel min-h-dvh"><AdminPasswordLogin /></div>;
  return <EasyChannelPanel />;
}