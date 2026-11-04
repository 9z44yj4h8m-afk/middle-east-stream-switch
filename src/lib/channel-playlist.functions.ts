import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Only official public playlist URLs are fetched server-side, never arbitrary hosts. */
export const fetchOfficialPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().url().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Forbidden");
    const url = new URL(data.url);
    if (url.origin !== "https://iptv-org.github.io" || !/^\/iptv\/[a-zA-Z0-9_/-]+\.m3u$/.test(url.pathname) || url.search || url.hash) throw new Error("رابط القائمة غير مدعوم؛ ارفع الملف بدلًا منه.");
    const response = await fetch(url.href, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body) throw new Error("تعذّر تحميل ملف القنوات.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "", size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2_000_000) throw new Error("الملف أكبر من 2 ميجابايت.");
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } finally { await reader.cancel(); }
  });