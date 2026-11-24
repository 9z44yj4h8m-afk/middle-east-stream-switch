import { createFileRoute } from "@tanstack/react-router";
import { RawHtmlPage } from "@/components/raw-html-page";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI — App" },
      { name: "description", content: "صفحة App من موقع ALMOGHANI." },
      { property: "og:title", content: "ALMOGHANI — App" },
      { property: "og:description", content: "صفحة App من موقع ALMOGHANI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: function AppPage() {
    return <RawHtmlPage src="/app.html" title="ALMOGHANI — App" />;
  },
});
