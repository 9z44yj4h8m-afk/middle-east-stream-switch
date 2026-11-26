import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiContactSchema } from "./ai-workspace";
import { mayDisableAiAccount } from "./ai-admin-access";

export const submitAiContact = createServerFn({ method: "POST" })
  .inputValidator((input) => aiContactSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) throw new Error("تعذّر إرسال الرسالة.");
    const secret = process.env["SITE_GATE_SECRET"];
    if (!secret) throw new Error("التواصل غير متاح الآن.");
    const ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-real-ip") || "unknown";
    const sender = createHmac("sha256", secret).update(ip).digest("hex");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("submit_ai_contact", { _name: data.name, _email: data.email, _message: data.message, _sender_hash: sender });
    if (error) throw new Error(error.message.includes("CONTACT_RATE_LIMIT") ? "أرسلت رسائل عديدة؛ حاول بعد قليل." : "تعذّر إرسال الرسالة؛ حاول مرة أخرى.");
    return { ok: true };
  });

export const listAiInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("غير مسموح.");
    const { data, error } = await context.supabase.from("ai_contact_messages").select("id,name,email,message,is_read,created_at").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("تعذّر تحميل الرسائل.");
    return data ?? [];
  });

export const setAiMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("غير مسموح.");
    if (context.userId === data.userId) throw new Error("لا يمكنك تعطيل حسابك.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (targetError || !target.user || !mayDisableAiAccount(context.userId, data.userId, target.user.email)) throw new Error("لا يمكن تعطيل حساب المالك.");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.suspended ? "876000h" : "none" });
    if (authError) throw new Error("تعذّر تحديث الحساب.");
    const { error } = await supabaseAdmin.from("profiles").update({ suspended: data.suspended }).eq("user_id", data.userId);
    if (error) throw new Error("تعذّر تحديث حالة العضو.");
    return { ok: true };
  });