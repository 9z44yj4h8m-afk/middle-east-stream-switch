import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ahmed")({
  beforeLoad: () => {
    throw redirect({ to: "/control" });
  },
});
