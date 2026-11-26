import { createFileRoute } from "@tanstack/react-router";
import { AiAdminPage } from "@/components/ai-admin-page";

export const Route = createFileRoute("/admin_ai")({
  head: () => ({ meta: [ { title: "إدارة المغني الذكي — الأقسام والحسابات" }, { name: "description", content: "لوحة إدارة المغني الذكي للأقسام والتصميم والمستخدمين ورسائل التواصل." }, { property: "og:title", content: "إدارة المغني الذكي" }, { property: "og:description", content: "لوحة الإدارة الخاصة بصفحة المغني الذكي." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" } ] }),
  component: AiAdminPage,
});