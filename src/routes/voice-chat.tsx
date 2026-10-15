import { createFileRoute } from "@tanstack/react-router";
import { AiChatPanel } from "@/components/ai-chat-panel";

export const Route = createFileRoute("/voice-chat")({
  head: () => ({
    meta: [
      { title: "الشات الصوتي — ALMOGHANI LIVE" },
      { name: "description", content: "شات صوتي في المغني لايف تسمع فيه سوالف الأعضاء بأصواتهم." },
      { property: "og:title", content: "الشات الصوتي — ALMOGHANI LIVE" },
      { property: "og:description", content: "اسمع السوالف المستمرة في الشات الصوتي للمغني لايف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoiceChatPage,
});

function VoiceChatPage() { return <AiChatPanel voice />; }
