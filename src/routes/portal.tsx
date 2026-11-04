import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [
    { title: "أقسام المغني لايف — المكتبة والدردشة" },
    { name: "description", content: "أقسام القنوات والأفلام ودخول الأعضاء والدردشة في المغني لايف." },
    { property: "og:title", content: "أقسام المغني لايف — المكتبة والدردشة" },
    { property: "og:description", content: "تصفح أقسام المغني لايف ومكتبة الأعضاء والدردشة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <PortalPage homepage />,
});