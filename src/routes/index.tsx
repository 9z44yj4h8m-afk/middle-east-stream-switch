import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "المغني لايف — بث مباشر" },
      {
        name: "description",
        content: "شاهد القنوات المباشرة داخل المغني لايف بواجهة عربية سريعة وواضحة.",
      },
      { property: "og:title", content: "المغني لايف — بث مباشر" },
      {
        property: "og:description",
        content: "مشاهدة القنوات المباشرة من مشغّل واحد داخل الموقع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalPage homepage />,
});

