import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseBthStream, type BthPublicBroadcast } from "./bth-stream";

const saveBroadcastInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start_link"),
    sourceUrl: z.string().min(8).max(1000),
  }),
  z.object({
    action: z.literal("start_webrtc"),
    sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
    source: z.enum(["screen", "camera"]),
  }),
  z.object({
    action: z.literal("stop"),
  }),
]);

export const checkBthOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !error && Boolean(admin) };
  });

export const saveBthPublicBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveBroadcastInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; state: BthPublicBroadcast }> => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("بدء البث للجمهور متاح للمالك فقط.");

    const now = new Date().toISOString();
    let state: BthPublicBroadcast;

    if (data.action === "stop") {
      state = { active: false, updatedAt: now };
    } else if (data.action === "start_link") {
      const parsed = parseBthStream(data.sourceUrl, "almoghani.net", true);
      if (!parsed.ok) throw new Error(parsed.error);
      state = {
        active: true,
        mode: "link",
        sourceUrl: parsed.stream.sourceUrl,
        label: parsed.stream.label,
        startedAt: now,
      };
    } else {
      state = {
        active: true,
        mode: "webrtc",
        sessionId: data.sessionId,
        source: data.source,
        label: data.source === "camera" ? "بث الكاميرا المباشر" : "بث الشاشة المباشر",
        startedAt: now,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "bth_public_stream",
      value: state as never,
      updated_at: now,
    });
    if (error) throw new Error("تعذر حفظ حالة البث حالياً؛ حاول مرة أخرى.");

    return { ok: true as const, state };
  });