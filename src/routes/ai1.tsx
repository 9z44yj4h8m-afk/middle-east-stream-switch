import { createFileRoute } from "@tanstack/react-router";
import { RawHtmlPage } from "@/components/raw-html-page";

export const Route = createFileRoute("/ai1")({
  head: () => ({
    meta: [
      { title: "مساعد المغني الذكي — برمجة وتصميم" },
      {
        name: "description",
        content: "مساعد عربي احترافي للبرمجة وتصميم المواقع والتطبيقات، مع خطط احترافية لمنصتي X وSnapchat.",
      },
      { property: "og:title", content: "مساعد المغني الذكي — برمجة وتصميم" },
      {
        property: "og:description",
        content: "مساعد عربي احترافي للبرمجة وتصميم المواقع والتطبيقات، مع خطط احترافية لمنصتي X وSnapchat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function Ai1Page() {
    return <RawHtmlPage src="/ai1.html" title="مساعد المغني الذكي" />;
  },
});
