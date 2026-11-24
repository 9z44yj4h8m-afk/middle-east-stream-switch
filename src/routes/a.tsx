import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/a")({
  beforeLoad: () => {
    throw redirect({ to: "/iptv", search: { view: "live" } });
  },
});
