import { createFileRoute } from "@tanstack/react-router";
import { RawHtmlPage } from "@/components/raw-html-page";

export const Route = createFileRoute("/youtube")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI — YouTube" },
      { name: "description", content: "صفحة YouTube من موقع ALMOGHANI." },
      { property: "og:title", content: "ALMOGHANI — YouTube" },
      { property: "og:description", content: "صفحة YouTube من موقع ALMOGHANI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function YoutubePage() {
    return <RawHtmlPage src="/youtube.html" title="ALMOGHANI — YouTube" />;
  },
});
