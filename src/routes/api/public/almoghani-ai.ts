import {
  CancelledError,
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
  streamResponse,
} from "@lovable.dev/ai-gateway";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth-request.server";
import { channels } from "@/lib/channels";

const CATALOG = channels
  .map((c) => `- ${c.name} | ${c.category} | /live?channel=${c.id}`)
  .join("\n");

const INSTRUCTIONS = `أنت "ALMOGHANI AI" (مساعد المغني الذكي)، مساعد عربي ذكي وودود داخل موقع almoghani.net.
أجب بالعربية الواضحة والمختصرة (أو بلغة المستخدم إن كتب بغيرها)، ورتّب إجابتك بعناوين أو نقاط قصيرة عند الحاجة.

## أقسام موقع المغني لايف
- البث المباشر: [البث المباشر](/live)
- تطبيق القنوات: [تطبيق القنوات](/iptv)
- القرآن الكريم (114 سورة قراءة واستماعًا بتلاوة الشيخ مشاري العفاسي): عند ذكر سورة اكتب رابطها هكذا [سورة الكهف](/quran?s=18) حيث الرقم هو ترتيب السورة (1–114).
- المسلسلات البدوية: [البدوية دراما](/bedouin-drama)
- الأفلام: [الأفلام](/movies)

## القنوات العامة المتاحة في الموقع (لا تخترع قنوات أو روابط غير هذه)
${CATALOG}
عند اقتراح قناة من القائمة اكتبها رابطًا هكذا بالضبط: [اسم القناة](/live?channel=المعرّف).
لا تنسب آية أو حديثًا إلا إن كنت متأكدًا منه، وعند الفتاوى انصح بالرجوع لأهل العلم.
في الأسئلة العامة (أفكار، كتابة، تصميم، تقنية، معلومات) أجب مباشرة وباحترافية.`;

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.literal("user"),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

function errorMessageFor(err: unknown): string {
  if (err instanceof PaymentRequiredError) return "رصيد الذكاء الاصطناعي غير كافٍ حاليًا.";
  if (err instanceof RateLimitError) return "الطلبات كثيرة الآن، حاول مرة أخرى بعد ثوانٍ.";
  if (err instanceof CancelledError) return "تم إيقاف الرد.";
  if (err instanceof GatewayError) return "تعذّر إكمال الرد الآن، حاول مرة أخرى.";
  return "حدث خطأ غير متوقع، حاول مرة أخرى.";
}

function sse(payload: { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string }): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export const Route = createFileRoute("/api/public/almoghani-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireApiUser(request);
        if (!auth.ok) return auth.response;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "طلب غير صالح." }, { status: 400 });
        }

        const parsed = RequestSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "تأكد من كتابة رسالتك بشكل صحيح." }, { status: 400 });
        }

        const turns = parsed.data.messages;

        let gatewayStream: Awaited<ReturnType<typeof streamResponse<"openai/gpt-6-astra">>>;
        try {
          gatewayStream = await streamResponse(
            {
              model: "openai/gpt-6-astra",
              instructions: INSTRUCTIONS,
              input: turns.map((m) => ({ role: "user" as const, content: m.content })),
              reasoning: { effort: "low" },
            },
            { signal: request.signal },
          );
        } catch (err) {
          const status = err instanceof PaymentRequiredError ? 402 : err instanceof RateLimitError ? 429 : 502;
          return Response.json({ error: errorMessageFor(err) }, { status });
        }

        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const event of gatewayStream) {
                if (event.type === "response.output_text.delta" && event.delta) {
                  controller.enqueue(sse({ type: "delta", text: event.delta }));
                }
              }
              controller.enqueue(sse({ type: "done" }));
            } catch (err) {
              if (!(err instanceof CancelledError) && !request.signal.aborted) {
                controller.enqueue(sse({ type: "error", message: errorMessageFor(err) }));
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(body, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});