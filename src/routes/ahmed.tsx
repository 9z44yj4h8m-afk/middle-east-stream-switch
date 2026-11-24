import { createFileRoute } from "@tanstack/react-router";
import { RawHtmlPage } from "@/components/raw-html-page";

export const Route = createFileRoute("/ahmed")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI — Ahmed" },
      { name: "description", content: "صفحة Ahmed من موقع ALMOGHANI." },
      { property: "og:title", content: "ALMOGHANI — Ahmed" },
      { property: "og:description", content: "صفحة Ahmed من موقع ALMOGHANI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function AhmedPage() {
    return <RawHtmlPage src="/ahmed.html" title="ALMOGHANI — Ahmed" />;
  },
});
