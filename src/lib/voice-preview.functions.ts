// Owner or subscribed-member voice preview: speaks admin-written text with a chosen voice via Lovable AI Gateway.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { singFallbacks, speakWithFallback, VOICE_LIST, voiceDelivery } from "@/lib/voice-config";

export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400), voice: z.string().max(40).optional(), sing: z.boolean().optional(), melody: z.string().max(20).optional(), rhythm: z.string().max(20).optional(), delivery: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) {
      const { data: session } = await context.supabase.from("member_library_sessions").select("unlocked").maybeSingle();
      if (!session?.unlocked) throw new Error("للمشتركين فقط");
    }
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("not configured");
    const voice = data.voice && VOICE_LIST.some((v) => v.id === data.voice) ? data.voice : "Leda";
    const custom = data.delivery?.trim() ? `قولي الكلام بصوت بنت ناعم، ${data.delivery.trim()}، اقرئي الكلام التالي فقط` : "";
    const res = await speakWithFallback(apiKey, voice, data.text, data.sing ? singFallbacks(data.melody, data.rhythm) : custom ? [custom, voiceDelivery(voice), ""] : [voiceDelivery(voice), ""]);
    if (!res.ok) throw new Error(await res.text());
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { audio: btoa(bin) };
  });
