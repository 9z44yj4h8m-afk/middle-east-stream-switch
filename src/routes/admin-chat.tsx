import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/components/member-provider";
import { Button } from "@/components/ui/button";
import { AdminPasswordLogin } from "@/components/admin/password-login";
import { CHAT_ADMIN_SECTIONS } from "@/components/admin/chat-tab";

export const Route = createFileRoute("/admin-chat")({
  ssr: false,
  head: () => ({ meta: [
    { title: "لوحة الشات — المغني" },
    { name: "description", content: "إدارة الشات والمستخدمين والأصوات في المغني لايف." },
    { property: "og:title", content: "لوحة الشات — المغني" },
    { property: "og:description", content: "إدارة الشات الكتابي والصوتي." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
    { name: "apple-mobile-web-app-title", content: "الشات" },
  ],
  }),
  component: AdminChatPage,
});

function AdminChatPage() {
  const { user, ready } = useMember();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { setAdmin(null); if (user) void supabase.rpc("claim_owner_admin").then(({ data }) => setAdmin(!!data)); }, [user]);
  if (!ready) return null;
  if (!user || admin === false) return <AdminPasswordLogin />;
  if (admin === null) return <div dir="rtl" className="grid min-h-screen place-items-center">جارٍ التحقق…</div>;
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold"><ArrowRight className="h-5 w-5" />ALMOGHANI LIVE</Link>
        <Button asChild size="sm" variant="outline"><Link to="/admin">لوحة الموقع</Link></Button>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">لوحة الشات</h1>
        <div className="mt-4"><Button asChild variant="outline"><Link to="/22">لوحة الأصوات</Link></Button></div>
        <nav aria-label="أقسام لوحة الشات" className="my-6 flex flex-wrap gap-2">
          {CHAT_ADMIN_SECTIONS.map(({ id, label }) => <Button key={id} asChild size="sm" variant="outline"><a href={`#chat-${id}`}>{label}</a></Button>)}
        </nav>
        {CHAT_ADMIN_SECTIONS.map(({ id, label, content: Content }) => <section key={id} id={`chat-${id}`} aria-label={label} className="scroll-mt-24 space-y-6 border-t border-border py-8">
          <h2 className="font-display text-2xl font-black">{label}</h2>
          <Content />
        </section>)}
      </main>
    </div>
  );
}
