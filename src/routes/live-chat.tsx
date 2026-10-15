import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LiveChat } from "@/components/live-chat";
import { useSiteConfig, defaultChat } from "@/lib/site-config";

export const Route = createFileRoute("/live-chat")({
  head: () => ({
    meta: [
      { title: "الدردشة العامة — المغني لايف" },
      { name: "description", content: "دردشة مباشرة مفتوحة لزوار المغني لايف بدون تسجيل دخول." },
      { property: "og:title", content: "الدردشة العامة — المغني لايف" },
      { property: "og:description", content: "تحدث مع متابعي البث المباشر على المغني لايف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { data } = useSiteConfig();
  const enabled = (data?.chat ?? defaultChat).enabled;
  return (
    <div dir="rtl" className="min-h-screen pb-28">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 pt-4 sm:px-6">
        <Link to="/" className="icon-button" aria-label="رجوع للرئيسية"><ArrowRight className="h-5 w-5" /></Link>
        <h1 className="font-display text-2xl font-black">الدردشة</h1>
      </div>
      {enabled ? <LiveChat /> : <p className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">الدردشة متوقفة مؤقتًا.</p>}
    </div>
  );
}
