import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bth")({
  head: () => ({
    meta: [
      { title: "بث المغني الشخصي — ALMOGHANI LIVE" },
      { name: "description", content: "شاشة بث المغني المباشر والشخصي داخل موقع المغني." },
      { property: "og:title", content: "بث المغني الشخصي — ALMOGHANI LIVE" },
      { property: "og:description", content: "شاشة بث المغني المباشر والشخصي داخل موقع المغني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://almoghani.net/bth" }],
  }),
  component: BroadcastPage,
});

function BroadcastPage() {
  return (
    <main className="fixed inset-0 h-dvh w-full overflow-hidden bg-background">
      <iframe
        src="https://almoghani-live-control.lovable.app/"
        title="المغني لايف — البث الشخصي"
        className="h-full w-full border-0 bg-background"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; camera; microphone; display-capture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </main>
  );
}