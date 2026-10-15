import { createFileRoute } from "@tanstack/react-router";
import { AiChatPanel } from "@/components/ai-chat-panel";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "الدردشة — ALMOGHANI LIVE" },
      { name: "description", content: "دردشة المغني لايف مع رسائل الأعضاء والمحادثات المباشرة." },
      { property: "og:title", content: "الدردشة — ALMOGHANI LIVE" },
      { property: "og:description", content: "شارك السوالف مع أعضاء المغني لايف في الدردشة العامة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() { return <AiChatPanel />; }
