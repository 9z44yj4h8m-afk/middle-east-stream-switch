import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRIVATE_PIN, privateMovies } from "./private-movies.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const unlockPrivateMovies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pin: z.string().regex(/^\d{1,8}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.from("member_library_sessions").select("unlocked").maybeSingle();
    if (error || !session?.unlocked) throw new Error("الجلسة مقفلة.");
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    if (data.pin !== PRIVATE_PIN) return { ok: false as const, movies: [] };
    return { ok: true as const, movies: privateMovies };
  });
