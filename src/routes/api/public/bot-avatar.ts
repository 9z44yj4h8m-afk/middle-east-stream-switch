import { createFileRoute } from "@tanstack/react-router";
import { safeAvatarPath } from "@/lib/bot-avatars";

// Chat character pictures sit in a private bucket with no public read rule. Visitors load
// them through this route, which only serves files the owner actually attached to a chat
// character, so a hand-written address can never reach another file or bucket.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type BotsSetting = { bots?: { avatar?: string }[] };

let allowCache: { at: number; paths: Set<string> } | null = null;
const TTL = 60 * 1000;

async function allowedAvatarPaths(): Promise<Set<string>> {
  if (allowCache && Date.now() - allowCache.at < TTL) return allowCache.paths;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "chat_bots")
      .maybeSingle();
    const bots = ((data?.value as BotsSetting | undefined)?.bots ?? []).filter(Boolean);
    const paths = new Set(bots.map((b) => safeAvatarPath(b.avatar)).filter(Boolean));
    allowCache = { at: Date.now(), paths };
    return paths;
  } catch {
    return allowCache?.paths ?? new Set();
  }
}

export const Route = createFileRoute("/api/public/bot-avatar")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("path") ?? "";
        const path = safeAvatarPath(raw);
        if (!path) return new Response("Path not allowed", { status: 403, headers: CORS });

        if (!(await allowedAvatarPaths()).has(path)) {
          return new Response("Not allowed", { status: 404, headers: CORS });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: file, error } = await supabaseAdmin.storage.from("bot-avatars").download(path);
        if (error || !file) return new Response("Not found", { status: 404, headers: CORS });

        const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
        return new Response(new Uint8Array(await file.arrayBuffer()), {
          headers: {
            ...CORS,
            "content-type": TYPES[ext] ?? file.type ?? "application/octet-stream",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
