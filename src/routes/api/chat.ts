import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id.server";
import { channels } from "@/lib/channels";

const CATALOG = channels.map((c) => `- ${c.name}  |  القسم: ${c.category}  |  الرابط: /live?channel=${c.id}`).join("\n");

const SYSTEM = `أنت "ALMOGHANI AI"، مساعد ذكي ودود داخل موقع almoghani.net.
تحدث بالعربية الفصحى المبسطة (أو بلغة المستخدم إن كتب بغيرها)، وأجب بإيجاز ووضوح مع تنسيق Markdown عند الحاجة.

## القنوات المتاحة في الموقع (هذه فقط، لا تذكر قناة غيرها كأنها في الموقع):
${CATALOG}
عند اقتراح قناة اكتبها رابطًا بصيغة Markdown بالضبط هكذا: [اسم القناة](/live?channel=المعرّف). لا تخترع روابط أو قنوات.

## صفحة القرآن الكريم
فيها السور الـ114 قراءةً بالرسم العثماني واستماعًا بتلاوة الشيخ مشاري العفاسي.
عند ذكر سورة أعطِ رابطها بصيغة: [سورة الكهف](/quran?s=18) حيث الرقم هو ترتيب السورة في المصحف (1–114).
عند الاستشهاد بآية اذكر اسم السورة ورقم الآية، ولا تقتبس نصًا قرآنيًا إلا إن كنت متأكدًا منه حرفيًا، وإلا فأحِل إلى رابط السورة.

عند الأسئلة الشرعية كن دقيقًا ومحترمًا، ولا تنسب حديثًا أو قولًا لا تتأكد من صحته، وانصح بالرجوع لأهل العلم في الفتاوى.`;

const PERSONA_STYLE: Record<string, string> = {
  default: "",
  bedouin: "أنت بوت سوالف بدوي خفيف الدم، تسولف باللهجة البدوية/الخليجية، تحب القصص والأمثال والمسلسلات البدوية في صفحة /bedouin-drama.",
  sports: "أنت بوت رياضي متحمس تسولف عن الكرة والرياضة باللهجة الخليجية، ولا تخترع نتائج أو مواعيد مباريات.",
  movies: "أنت بوت سينمائي تسولف عن الأفلام والمسلسلات وتقترح من قسم /movies والقنوات المتاحة فقط.",
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("الخدمة غير مهيأة حاليًا.", { status: 500 });

        let messages: UIMessage[];
        let persona = "default";
        try {
          const body = (await request.json()) as { messages?: unknown };
          if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 100) {
            return new Response("طلب غير صالح.", { status: 400 });
          }
          // Only accept plain-text user turns; drop caller-supplied assistant/system roles.
          messages = (body.messages as UIMessage[])
            .filter((m) => m && m.role === "user" && Array.isArray(m.parts))
            .map((m, i) => ({
              id: String(m.id ?? i).slice(0, 64),
              role: "user" as const,
              parts: m.parts
                .filter((p): p is { type: "text"; text: string } => p?.type === "text" && typeof (p as { text?: unknown }).text === "string")
                .map((p) => ({ type: "text" as const, text: p.text.slice(0, 4000) })),
            }))
            .filter((m) => m.parts.length > 0)
            .slice(-30);
          if (messages.length === 0) return new Response("طلب غير صالح.", { status: 400 });
          const p = (body as { persona?: unknown }).persona;
          if (typeof p === "string" && p in PERSONA_STYLE) persona = p;
        } catch {
          return new Response("طلب غير صالح.", { status: 400 });
        }

        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: SYSTEM + (PERSONA_STYLE[persona] ? `\n\n## الشخصية الحالية\n${PERSONA_STYLE[persona]}` : ""),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              store: false,
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onError: (error) => {
            const status = (error as { statusCode?: number })?.statusCode;
            if (status === 429) return "الطلبات كثيرة حاليًا، حاول بعد قليل.";
            if (status === 402) return "رصيد الذكاء الاصطناعي نفد مؤقتًا.";
            return "تعذّر الحصول على رد، حاول مرة أخرى.";
          },
        });
      },
    },
  },
});
