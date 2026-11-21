import { createFileRoute } from "@tanstack/react-router";

const responseHeaders = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
const failure = (message: string, status: number) => new Response(message, { status, headers: responseHeaders });

export const Route = createFileRoute("/api/public/iptv")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { openRelayToken, relayUrl, safeRelayTarget } = await import("@/lib/iptv/relay-token.server");
        const secret = process.env["SITE_GATE_SECRET"];
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!secret || !url || !key) return failure("المشاهدة غير متاحة مؤقتًا.", 503);
        let grant;
        try {
          grant = openRelayToken(new URL(request.url).searchParams.get("t") ?? "", secret);
        } catch { return failure("سجّل الدخول لفتح المشاهدة.", 401); }
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { apikey: key, Authorization: `Bearer ${grant.bearer}` } },
        });
        const claims = await client.auth.getClaims(grant.bearer);
        if (claims.error || !claims.data?.claims.sub) return failure("انتهت جلسة الدخول.", 401);
        const { data: session, error } = await client.from("member_library_sessions").select("unlocked").maybeSingle();
        if (error || !session?.unlocked) return failure("الجلسة مقفلة؛ افتح المكتبة أولًا.", 403);
        let target = new URL(grant.url);
        const headers = new Headers({ "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" });
        const range = request.headers.get("range");
        if (range) headers.set("Range", range);
        try {
          let upstream: Response | undefined;
          for (let hop = 0; hop < 6; hop++) {
            if (!safeRelayTarget(target)) return failure("عنوان البث غير مسموح.", 403);
            upstream = await fetch(target, { headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
            if (upstream.status < 300 || upstream.status >= 400) break;
            const location = upstream.headers.get("location");
            await upstream.body?.cancel();
            if (!location || hop === 5) return failure("تعذّر الوصول للبث.", 502);
            target = new URL(location, target);
          }
          if (!upstream?.ok) return failure("مزوّد الاشتراك رفض تشغيل البث داخل الموقع.", 502);
          const type = upstream.headers.get("content-type") ?? "";
          if (target.pathname.endsWith(".m3u8") || type.includes("mpegurl")) {
            const text = await upstream.text();
            if (!text.trimStart().startsWith("#EXTM3U")) return failure("المزوّد لم يُرسل بثًا صالحًا.", 502);
            const wrap = (value: string) => {
              const next = new URL(value, target);
              if (!safeRelayTarget(next)) throw new Error("Invalid target");
              return relayUrl(next.toString(), grant.bearer, secret);
            };
            const playlist = text.split("\n").map((line) => {
              if (!line.trim()) return line;
              return line.startsWith("#") ? line.replace(/URI="([^"]+)"/g, (_match, value: string) => `URI="${wrap(value)}"`) : wrap(line.trim());
            }).join("\n");
            return new Response(playlist, { headers: { ...responseHeaders, "content-type": "application/vnd.apple.mpegurl" } });
          }
          if (type.includes("text/html") || type.includes("application/json")) return failure("المزوّد لم يُرسل فيديو.", 502);
          const outgoing = new Headers({ ...responseHeaders, "content-type": type || "video/mp2t", "accept-ranges": "bytes" });
          for (const name of ["content-length", "content-range"]) {
            const value = upstream.headers.get(name);
            if (value) outgoing.set(name, value);
          }
          return new Response(upstream.body, { status: upstream.status, headers: outgoing });
        } catch { return failure("تعذّر الاتصال بمزوّد الاشتراك.", 502); }
      },
    },
  },
});