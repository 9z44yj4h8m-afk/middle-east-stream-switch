import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "a0552525337@gmail.com";

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: profiles, error } = await context.supabase.from("profiles").select("user_id,display_name,last_login_at,created_at,suspended").order("created_at", { ascending: false });
    if (error) throw error;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (profiles ?? []).map((p) => ({ ...p, email: emails.get(p.user_id) ?? "" }));
  });

/** Role management — privileged work through the service-role client after admin verification. */
export const listRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("user_roles").select("user_id,role");
    return (data ?? []) as { user_id: string; role: "admin" | "user" }[];
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = (u?.user?.email ?? "").toLowerCase();
    if (email === OWNER_EMAIL && data.role !== "admin") throw new Error("لا يمكن سحب صلاحية المالك.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw error;
    return { ok: true as const };
  });

/** Finds an existing member by email so the owner can grant a role. */
export const findMemberByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email().max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const hit = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!hit) return null;
    return { userId: hit.id, email: hit.email ?? email };
  });

/** Verifies a stream link responds before the owner saves it. */
export const checkStreamUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const url = data.url;
    const yt = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/)?.[1];
    try {
      if (yt) {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`);
        return r.ok ? { ok: true as const, kind: "youtube" as const } : { ok: false as const, reason: "فيديو يوتيوب غير متاح أو يمنع التشغيل في المواقع." };
      }
      if (!url.startsWith("https://")) return { ok: false as const, reason: "الرابط يجب أن يبدأ بـ https حتى يعمل داخل الموقع." };
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = r.ok ? (await r.text()).slice(0, 2000) : "";
      if (!r.ok) return { ok: false as const, reason: `الرابط لا يستجيب (رمز ${r.status}).` };
      if (!text.includes("#EXTM3U")) return { ok: false as const, reason: "الرابط لا يحتوي بث HLS صالح (m3u8)." };
      return { ok: true as const, kind: "hls" as const };
    } catch {
      return { ok: false as const, reason: "تعذّر الوصول إلى الرابط." };
    }
  });

/** Owner creates a member account directly (confirmed email, profile name). */
export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email().max(120), password: z.string().min(8).max(72), name: z.string().trim().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email.trim().toLowerCase(), password: data.password, email_confirm: true, user_metadata: { display_name: data.name } });
    if (error || !created.user) throw new Error(error?.message.includes("already") ? "البريد مسجّل مسبقًا." : "تعذّر إنشاء العضو.");
    await supabaseAdmin.from("profiles").upsert({ user_id: created.user.id, display_name: data.name });
    return { ok: true as const };
  });

/** Owner sets a new login password for a member. */
export const setMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error("تعذّر تغيير كلمة المرور.");
    return { ok: true as const };
  });
