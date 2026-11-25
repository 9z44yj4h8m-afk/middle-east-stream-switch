import { createFileRoute } from "@tanstack/react-router";

// The standalone assistant page (public/ai1.html) talks to its own AI server.
// Browsers cannot call that server directly (it sends no cross-origin permission),
// so the page posts here and we forward the chat to the assistant server.
const UPSTREAM = "https://almoghani-9lp8nvwy.manus.space/api/trpc/chat.complete?batch=1";
const MAX_BODY = 200_000; // ~200KB of chat text
const MAX_MESSAGES = 40;
const MAX_TEXT = 8000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

type Turn = { role?: unknown; content?: unknown };

function validBody(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const first = (raw as Record<string, unknown>)["0"];
  const json = (first as { json?: unknown })?.json;
  const messages = (json as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
  return messages.every((m) => {
    const turn = m as Turn;
    return (
      !!turn &&
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.content === "string" &&
      turn.content.length <= MAX_TEXT
    );
  });
}

export const Route = createFileRoute("/api/public/ai-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length === 0 || raw.length > MAX_BODY) {
          return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
        }
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
        }
        if (!validBody(body)) {
          return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
        }

        const upstream = await fetch(UPSTREAM, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.ok ? 200 : 502,
          headers: { ...CORS, "content-type": "application/json" },
        });
      },
    },
  },
});
