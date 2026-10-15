import { createFileRoute } from "@tanstack/react-router";

// Transcribes a visitor's 20-second mic turn so the next bot can answer it.
export const Route = createFileRoute("/api/public/voice-listen")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("not configured", { status: 500 });
        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File) || !file.size || file.size > 3_000_000 || !file.type.startsWith("audio/")) return Response.json({ error: "bad audio" }, { status: 400 });
        const up = new FormData();
        up.append("model", "openai/gpt-transcribe");
        up.append("file", file, file.name || "turn.webm");
        up.append("response_format", "json");
        up.append("languages", "ar");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: up });
        if (!res.ok) return Response.json({ error: await res.text() }, { status: res.status });
        const data = (await res.json()) as { text?: string };
        return Response.json({ text: String(data.text ?? "").slice(0, 400) });
      },
    },
  },
});
