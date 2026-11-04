import { createFileRoute } from "@tanstack/react-router";
import { IptvApp } from "@/components/iptv-app";
import type { IptvView } from "@/lib/iptv-app";

export const Route = createFileRoute("/iptv")({
  validateSearch: (search: Record<string, unknown>): { view: IptvView } => ({ view: search["view"] === "movies" || search["view"] === "series" || search["view"] === "favorites" ? search["view"] : "live" }),
  head: () => ({ meta: [
    { title: "ALMOGHANI IPTV — القنوات والأفلام والمسلسلات" },
    { name: "description", content: "تطبيق المغني IPTV للجميع: القنوات المباشرة والأفلام والمسلسلات والمفضلة." },
    { property: "og:title", content: "ALMOGHANI IPTV — تطبيق المشاهدة" },
    { property: "og:description", content: "شاهد القنوات العامة والأفلام والمسلسلات في تطبيق المغني IPTV." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: IptvPage,
});
function IptvPage() { return <IptvApp view={Route.useSearch().view} />; }