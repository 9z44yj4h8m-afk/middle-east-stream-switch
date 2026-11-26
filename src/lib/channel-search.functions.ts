import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findMatchingChannelIds } from "./channel-search.server.ts";

const inputSchema = z.object({
  query: z.string().trim().min(2).max(200),
  channels: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(240),
      }),
    )
    .max(200),
});

export const searchChannelsWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("suspended")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profile?.suspended) throw new Error("هذا الحساب معطّل؛ تواصل مع الإدارة.");
    try {
      return { ids: await findMatchingChannelIds(data.query, data.channels) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر إكمال البحث الذكي.";
      throw new Error(message);
    }
  });