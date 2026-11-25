import { createFileRoute } from "@tanstack/react-router";
import { AlmoghaniAiPage } from "@/components/almoghani-ai-page";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI AI — المغني الذكي" },
      {
        name: "description",
        content:
          "مساعد المغني الذكي: اسأل عن القنوات والأفلام والمسلسلات والقرآن واحصل على إجابة فورية.",
      },
      { property: "og:title", content: "ALMOGHANI AI" },
      {
        property: "og:description",
        content: "مساعد المغني الذكي داخل موقع المغني لايف.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlmoghaniAiPage,
});
