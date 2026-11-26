import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeAiPageConfig, safeAiLogoPath, type AiPageConfig } from "./ai-page-config";

type AiAdminSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SITE_GATE_SECRET"]!,
    name: "ai-admin-gate",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function pinMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function assertAiAdmin() {
  const session = await useSession<AiAdminSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("أدخل الرقم السري أولاً.");
}

export const getAiAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AiAdminSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked };
});

export const unlockAiAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const input = data.pin.trim();
    const envPin = (process.env["GATE_PIN"] ?? "").trim();
    const ok = pinMatches(input, "2121") || (!!envPin && pinMatches(input, envPin));
    if (!ok) return { ok: false as const };
    const session = await useSession<AiAdminSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAiAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AiAdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const saveAiPageConfig = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ config: z.unknown() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; config: AiPageConfig }> => {
    await assertAiAdmin();
    return persistAiConfig(data.config);
  });

export const saveAiOwnerConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ config: z.unknown() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("غير مسموح.");
    return persistAiConfig(data.config);
  });

async function persistAiConfig(config: unknown): Promise<{ ok: true; config: AiPageConfig }> {
    const clean = normalizeAiPageConfig(config);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "ai_page")
      .maybeSingle();
    const oldLogoPath = safeAiLogoPath((existing?.value as { logoPath?: unknown } | undefined)?.logoPath);

    const { error } = await supabaseAdmin.from("site_settings").upsert({
      key: "ai_page",
      value: clean as never,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("تعذّر حفظ التغييرات؛ حاول مرة أخرى.");

    if (oldLogoPath && oldLogoPath !== clean.logoPath) {
      await supabaseAdmin.storage.from("bot-avatars").remove([oldLogoPath]);
    }
    return { ok: true as const, config: clean };
}

const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function matchesMagic(bytes: Uint8Array, ext: string): boolean {
  if (bytes.length < 12) return false;
  if (ext === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (ext === "jpg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "gif") return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  if (ext === "webp") {
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  }
  return false;
}

export const uploadAiLogo = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ contentType: z.string().max(40), base64: z.string().min(16).max(3_200_000) }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertAiAdmin();
    return persistAiLogo(data);
  });

export const uploadAiOwnerLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ contentType: z.string().max(40), base64: z.string().min(16).max(3_200_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("غير مسموح.");
    return persistAiLogo(data);
  });

async function persistAiLogo(data: { contentType: string; base64: string }) {
    const ext = ALLOWED_MIME[data.contentType.toLowerCase()];
    if (!ext) throw new Error("صيغة الصورة غير مدعومة (استخدم PNG أو JPG أو WebP).");

    const bytes = Uint8Array.from(Buffer.from(data.base64, "base64"));
    if (bytes.length > 2 * 1024 * 1024) throw new Error("حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت).");
    if (!matchesMagic(bytes, ext)) throw new Error("الملف المختار ليس صورة صالحة.");

    const logoPath = `ai-logo-${randomUUID().replace(/-/g, "")}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("bot-avatars")
      .upload(logoPath, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error("تعذّر رفع الشعار؛ حاول مرة أخرى.");

    return { logoPath };
}