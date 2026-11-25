import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const AI_URL =
  "https://almoghani-manus-proxy-e6362a-routes-a0552525337aa-lab.vercel.app/ai?locale=ar";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI AI — المغني الذكي" },
      {
        name: "description",
        content:
          "مساعد المغني الذكي: اسأل عن القنوات والأفلام والمسلسلات والقرآن واحصل على إجابة فورية.",
      },
      { property: "og:title", content: "ALMOGHANI AI" },
      {
        property: "og:description",
        content: "مساعد المغني الذكي داخل موقع المغني لايف.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // The assistant keeps a live connection open, so its iframe "load" event can
    // arrive late (or never). Dismiss the splash on a short timer as well.
    const t = setTimeout(() => setLoaded(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-background" style={{ height: "100dvh" }}>
      <iframe
        src={AI_URL}
        title="ALMOGHANI AI"
        onLoad={() => setLoaded(true)}
        allow="autoplay; microphone; camera; clipboard-write; clipboard-read; fullscreen"
        className="h-full w-full border-0"
        style={{ height: "100dvh" }}
      />
      {!loaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
          style={{ height: "100dvh" }}
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            جاري تشغيل مساعد المغني الذكي…
          </p>
        </div>
      )}
    </div>
  );
}
