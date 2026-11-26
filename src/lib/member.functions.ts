import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMemberAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let { data: profile, error } = await context.supabase.from("profiles").select("display_name,last_login_at,library_approved").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    if (!profile) {
      const result = await context.supabase.rpc("ensure_member_profile");
      if (result.error) throw result.error;
      const resultProfile = await context.supabase.from("profiles").select("display_name,last_login_at,library_approved").eq("user_id", context.userId).single();
      if (resultProfile.error) throw resultProfile.error;
      profile = resultProfile.data;
    }
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: session, error: sessionError } = await context.supabase.from("member_library_sessions").select("unlocked,entered_at").maybeSingle();
    if (sessionError) throw sessionError;
    return {
      name: profile?.display_name || "عضو ALMOGHANI",
      enteredAt: session?.entered_at ?? profile?.last_login_at,
      unlocked: session?.unlocked === true,
      libraryApproved: isAdmin === true || profile?.library_approved === true,
    };
  });

export const unlockMemberLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ pin: z.string().regex(/^\d{4}$/) }).parse(data))
  .handler(async ({ context, data }) => {
    const result = await context.supabase.rpc("unlock_member_library", { p_pin: data.pin });
    if (result.error) {
      if (result.error.message.includes("subscription_required")) return { ok: false as const, reason: "subscription" as const };
      if (result.error.message.includes("too_many_attempts")) return { ok: false as const, reason: "locked" as const };
      throw result.error;
    }
    return result.data === true ? { ok: true as const } : { ok: false as const, reason: "wrong_pin" as const };
  });

export const lockMemberLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result = await context.supabase.from("member_library_sessions").update({ unlocked: false }).eq("user_id", context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });
export const notifyOwnerNewMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const claims = context.claims as { email?: string; user_metadata?: { display_name?: string; full_name?: string } };
    const { data: profile } = await context.supabase.from("profiles").select("display_name").eq("user_id", context.userId).maybeSingle();
    try {
      await sendTemplateEmail("new-member-request", "a0552525337@gmail.com", {
        templateData: { name: profile?.display_name || claims.user_metadata?.display_name || claims.user_metadata?.full_name, email: claims.email, createdAt: new Date().toISOString().slice(0, 16).replace("T", " ") },
        idempotencyKey: `new-member-request-${context.userId}`,
      });
    } catch (e) { console.error("owner notify failed", e); }
    return { ok: true };
  });
