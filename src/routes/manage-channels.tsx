import { createFileRoute } from "@tanstack/react-router";
import { ChannelDashboard } from "@/components/admin/channel-dashboard";

export const Route = createFileRoute("/manage-channels")({
  ssr: false,
  head: () => ({ meta: [
    { title: "إدارة قنوات الموقع — ALMOGHANI LIVE" },
    { name: "description", content: "لوحة مالك المغني لإدارة القنوات واستيرادها وتعديل الأقسام والمظهر." },
    { property: "og:title", content: "إدارة قنوات الموقع — ALMOGHANI LIVE" },
    { property: "og:description", content: "لوحة إدارة قنوات المغني والأقسام والمظهر." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: ChannelDashboard,
});