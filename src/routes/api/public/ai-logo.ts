import { createFileRoute } from "@tanstack/react-router";
import { safeAiLogoPath } from "@/lib/ai-page-config";

// Serves only the exact logo file currently saved for /ai in site_settings("ai_page").
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

export const Route = createFileRoute("/api/public/ai-logo")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("path") ?? "";
        const path = safeAiLogoPath(raw);
        if (!path) return new Response("Path not allowed", { status: 403, headers: CORS });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: setting } = await supabaseAdmin
          .from("site_settings")
          .select("value")
          .eq("key", "ai_page")
          .maybeSingle();
        const activePath = safeAiLogoPath(
          (setting?.value as { logoPath?: unknown } | undefined)?.logoPath,
        );
        if (!activePath || activePath !== path) {
          return new Response("Not found", { status: 404, headers: CORS });
        }

        const { data: file, error } = await supabaseAdmin.storage
          .from("bot-avatars")
          .download(path);
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