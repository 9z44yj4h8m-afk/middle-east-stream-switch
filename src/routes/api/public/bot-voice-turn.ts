import { createFileRoute } from "@tanstack/react-router";
import { voiceMonologue } from "@/lib/chat-bots.functions";
import { VOICE_LIST, normalizeVoiceChat, singFallbacks, speakWithFallback, voiceDelivery } from "@/lib/voice-config";

function pickVoice(name: string, list: string[]) {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return list[h % list.length] ?? "Leda";
}

// Generates one spoken bot turn. Text is server-chosen, so this cannot be used as a free TTS service.
export const Route = createFileRoute("/api/public/bot-voice-turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { previous, heard, fast, lastClip, lastSay } = (await request.json().catch(() => ({}))) as { previous?: string; heard?: string; fast?: boolean; lastClip?: string; lastSay?: string };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("site_settings").select("value").eq("key", "voice_chat").maybeSingle();
        const cfg = normalizeVoiceChat(row?.value);
        if (!cfg.enabled) return new Response("disabled", { status: 403, headers: { "X-Voice-Disabled": "1" } });
        const configured = [{ name: "نغم 🎶", path: cfg.recordings.song }, { name: "قصيدة 🌹", path: cfg.recordings.poem }, ...cfg.clips.filter((c) => c.enabled)];
        const available = configured.filter((r) => r.path && r.name !== previous);
        const candidates = available.length ? available : configured.filter((r) => r.path);
        const say = cfg.say && cfg.say.id !== lastSay && Date.now() - cfg.say.at < 600000 ? cfg.say : null;
        const recording = say ? undefined : fast === true ? candidates.find((r) => r.name === "نغم 🎶") ?? candidates[0] : !heard ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;
        if (recording) {
          const { data: audio, error } = await supabaseAdmin.storage.from("chat-recordings").download(recording.path);
          if (!error && audio) return new Response(audio, { headers: { "Content-Type": audio.type || "audio/mpeg", "X-Bot-Name": encodeURIComponent(recording.name), "X-Turn-Ms": String(cfg.turnSeconds * 1000), "Cache-Control": "no-store" } });
        }
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("not configured", { status: 500 });
        const gen = say ? { name: say.name, text: say.text, female: VOICE_LIST.some((v) => v.id === say.voice && v.female), mode: say.sing ? "sing" : "talk" } : await voiceMonologue(String(previous ?? "").slice(0, 40), String(heard ?? "").slice(0, 400), fast === true, cfg.openers);
        const { name, text, female, mode } = gen;
        const voice = say?.voice || (cfg.botVoices[name] ?? (mode === "sing" ? "Leda" : mode === "poem" ? "Achernar" : null) ?? (fast === true && female ? "Leda" : null) ?? pickVoice(name, female ? cfg.femaleVoices : cfg.maleVoices));
        const direction = mode === "sing" ? "غنيها بصوت بنت ناعم عذب ورقيق جدا، بلحن هادئ حالم وطرب سعودي نجدي أصيل، مدّي الكلمات كأنك تغنين" : mode === "poem" ? "ألقيها بصوت بنت ناعم رقيق، بإلقاء شعر نبطي سعودي هادئ مؤثر ووقفات بين الأبيات" : voiceDelivery(voice);
        const res = await speakWithFallback(apiKey, voice, text, say?.sing ? singFallbacks(say.melody, say.rhythm) : mode === "sing" ? [direction, "غنيها بصوت بنت ناعم", ""] : [direction, ""]);
        if (!res.ok) return new Response(await res.text(), { status: res.status });
        return new Response(res.body, { headers: { "Content-Type": res.headers.get("Content-Type") ?? "audio/wav", "X-Bot-Name": encodeURIComponent(name), ...(say ? { "X-Say-Id": say.id } : {}), "X-Turn-Ms": String(cfg.turnSeconds * 1000), "Cache-Control": "no-store" } });
      },
    },
  },
});
