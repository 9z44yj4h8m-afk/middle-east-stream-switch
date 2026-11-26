// Voice-changer TTS for the owner-authenticated /mic page.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { speakWithFallback, VOICE_LIST, voiceDelivery } from "@/lib/voice-config";

export const micSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400), voice: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("غير مسموح.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("not configured");
    const voice = VOICE_LIST.some((v) => v.id === data.voice) ? data.voice : "Leda";
    const res = await speakWithFallback(apiKey, voice, data.text, [voiceDelivery(voice), ""]);
    if (!res.ok) throw new Error(await res.text());
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { audio: btoa(bin) };
  });
