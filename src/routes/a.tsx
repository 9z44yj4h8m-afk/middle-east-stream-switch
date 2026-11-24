import { createFileRoute } from "@tanstack/react-router";
import { RawHtmlPage } from "@/components/raw-html-page";

export const Route = createFileRoute("/a")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI — A" },
      { name: "description", content: "صفحة A من موقع ALMOGHANI." },
      { property: "og:title", content: "ALMOGHANI — A" },
      { property: "og:description", content: "صفحة A من موقع ALMOGHANI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function APage() {
    return <RawHtmlPage src="/a.html" title="ALMOGHANI — A" />;
  },
});
