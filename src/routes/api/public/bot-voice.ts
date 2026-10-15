import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const VOICES = ["Puck", "Charon", "Fenrir", "Orus", "Kore", "Aoede", "Leda", "Zephyr"];
const MODEL = "google/gemini-3.1-flash-tts-preview";

function voiceFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return VOICES[h % VOICES.length];
}

export const Route = createFileRoute("/api/public/bot-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messageId } = (await request.json().catch(() => ({}))) as { messageId?: string };
        if (!messageId || !/^[0-9a-f-]{36}$/i.test(messageId)) return new Response("bad request", { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("not configured", { status: 500 });
        // Only speak text that already exists in the chat, so this endpoint cannot be used as a free TTS service.
        const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false } });
        const { data: msg } = await sb.from("chat_messages").select("display_name,body").eq("id", messageId).maybeSingle();
        if (!msg) return new Response("not found", { status: 404 });
        const text = String(msg.body).replace(/[\u064B-\u0652\u0670]/g, "").slice(0, 300);
        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: `قلها بلهجة خليجية ودودة: ${text}` }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(msg.display_name) } } } },
            stream_format: "audio",
          }),
        });
        if (!res.ok) return new Response(await res.text(), { status: res.status });
        return new Response(res.body, { headers: { "Content-Type": res.headers.get("Content-Type") ?? "audio/wav", "Cache-Control": "public, max-age=86400" } });
      },
    },
  },
});
