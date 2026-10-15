import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "البث المباشر — المغني لايف" },
      { name: "description", content: "كل قنوات البث المباشر في مشغّل واحد داخل المغني لايف." },
      { property: "og:title", content: "البث المباشر — المغني لايف" },
      { property: "og:description", content: "اختر قناة وشاهدها مباشرة داخل الموقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalPage />,
});
