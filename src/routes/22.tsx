import { createFileRoute, Link } from "@tanstack/react-router";
import { VoicePinGate } from "@/components/admin/voice-pin-gate";
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
  return <div dir="rtl" className="voice-studio-page voice-studio-full">
    <main className="voice-studio-main">
      <Link to="/mic" className="block text-center rounded-xl bg-primary text-primary-foreground font-bold py-2 mb-2">🎙️ حوّل صوتي لصوت بنت</Link>
      <SayNowForm locked={false} />
    </main>
  </div>;
}
