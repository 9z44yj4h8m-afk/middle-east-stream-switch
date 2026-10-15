import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule-admin")({
  head: () => ({ meta: [{ title: "إدارة مواعيد البث — المغني لايف" }, { name: "description", content: "إدارة جدول بث قنوات المغني لايف للمالك." }, { property: "og:title", content: "إدارة مواعيد البث — المغني لايف" }, { property: "og:description", content: "لوحة مواعيد بث قنوات المغني لايف." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: () => { throw redirect({ to: "/admin", search: { tab: "schedule" } }); },
});
