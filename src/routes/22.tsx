import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VoicePinGate } from "@/components/admin/voice-pin-gate";
import { useMember } from "@/components/member-provider";
import { Link } from "@tanstack/react-router";
import { SayNowForm } from "@/components/admin/voice-chat-manager";

export const Route = createFileRoute("/22")({
  ssr: false,
  head: () => ({ meta: [
    { title: "لوحة الأصوات — المغني لايف" },
    { name: "description", content: "لوحة المالك لتجربة أصوات البوتات النسائية وحفظها في المغني لايف." },
    { property: "og:title", content: "لوحة الأصوات — المغني لايف" },
    { property: "og:description", content: "تخصيص أصوات البوتات وتجريب الصوت وحفظ اختيار البوت." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
    { name: "apple-mobile-web-app-title", content: "الأصوات" },
  ],
  }),
  component: () => <VoicePinGate><AdminVoicesPage /></VoicePinGate>,
});

function AdminVoicesPage() {
  const { user, ready } = useMember();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    setAdmin(null);
    if (!user) setAdmin(false); else void supabase.rpc("claim_owner_admin").then(async ({ data }) => {
      if (data) { if (alive) setAdmin(true); return; }
      const { data: s } = await supabase.from("member_library_sessions").select("unlocked").maybeSingle();
      if (alive) setAdmin(s?.unlocked === true);
    });
    return () => { alive = false; };
  }, [user]);
  if (!ready) return null;
  const locked = admin !== true;
  return <div dir="rtl" className="voice-studio-page voice-studio-full">
    <main className="voice-studio-main">
      <Link to="/mic" className="block text-center rounded-xl bg-primary text-primary-foreground font-bold py-2 mb-2">🎙️ حوّل صوتي لصوت بنت</Link>
      <SayNowForm locked={locked} />
    </main>
  </div>;
}
