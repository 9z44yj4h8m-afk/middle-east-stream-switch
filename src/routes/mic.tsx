import { createFileRoute, Link } from "@tanstack/react-router";
import { VoicePinGate } from "@/components/admin/voice-pin-gate";
import { RealGirlVoice } from "@/components/admin/real-girl-voice";
import { MicVoiceChanger } from "@/components/admin/mic-voice-changer";

export const Route = createFileRoute("/mic")({
  ssr: false,
  head: () => ({ meta: [
    { title: "تحويل الصوت — المغني لايف" },
    { name: "description", content: "حوّل صوتك من المايك إلى صوت بنت مباشرة وسجّله." },
    { property: "og:title", content: "تحويل الصوت — المغني لايف" },
    { property: "og:description", content: "مغيّر صوت مباشر من المايك داخل لوحة الأصوات." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <VoicePinGate><MicPage /></VoicePinGate>,
});

function MicPage() {
  return <div dir="rtl" className="min-h-screen overflow-y-auto bg-background p-4">
    <Link to="/22" className="inline-block mb-3 text-sm text-primary">→ رجوع للوحة الأصوات</Link>
    <RealGirlVoice />
    <MicVoiceChanger />
  </div>;
}
