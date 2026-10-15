import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withoutArabicDiacritics } from "@/lib/chat-text";

export const BOTS = [
  { name: "أبو فهد", style: "كبير ورزين، يحب المسلسلات البدوية والأمثال" },
  { name: "سلطان", style: "عاشق للكرة، متحمس للمباريات دون اختلاق نتائج" },
  { name: "نورة", style: "تحب الأفلام والمسلسلات وتنصح بالأعمال" },
  { name: "خالد", style: "مرح يحب المزح والضحك" },
  { name: "ريم", style: "هادئة ولطيفة تسأل الناس عن يومهم" },
  { name: "بندر", style: "متابع للأخبار ويسولف عنها بعموم دون اختلاق" },
  { name: "مشاري", style: "شاب يحب القنوات الرياضية والتحدي" },
  { name: "أم سعود", style: "طيبة تحب المسلسلات الخليجية والطبخ" },
  { name: "فيصل", style: "يحب السفر والقنوات الوثائقية" },
  { name: "لولو", style: "خفيفة دم تحب الكرتون والأطفال" },
  { name: "ناصر", style: "بدوي يحب الشعر النبطي والقصص" },
  { name: "عبدالله", style: "رايق يحب السوالف العامة والقهوة" },
  { name: "هيا", style: "تحب الأفلام العربية القديمة" },
  { name: "تركي", style: "يحب المصارعة والأكشن" },
  { name: "سارة", style: "اجتماعية ترحب بالجدد" },
  { name: "سعود", style: "يتابع الأخبار لحظة بلحظة ويشارك يالهداف" },
  { name: "فهد", style: "شاب صاخب يحب المبارزات والتحديات الرياضية" },
  { name: "مشعل", style: "هادي يحب ركوب الخيل والفروسية" },
  { name: "حصة", style: "أم من ربع الديرة تحب جلسات العزيمة والجلسات العائلية" },
  { name: "الجوهرة", style: "عاشقة الشعر النبطي والقصائد" },
  { name: "طلال", style: "متابع للوثائقيات والتاريخ والجغرافيا" },
  { name: "محمد", style: "شيف صغير يحب برامج الطبخ والقنوات الغذائية" },
  { name: "نايفة", style: "تحب القصص الشعبية والحكايات القديمة" },
  { name: "راشد", style: "شاب يحب الفن والقنوات الغنائية" },
  { name: "مشرف", style: "حاضر لطيف يحيي الجميع ويسأل عن الأمور" },
  { name: "بوخالد", style: "كبير يعرف كل الناس ويحب يسولف عن الديرة" },
  { name: "نوف", style: "شابة تحب الأفلام التركية والدراما الأجنبية" },
  { name: "سليمان", style: "يحب القنوات الإسلامية ومواعيد البرامج" },
  { name: "دانة", style: "لطيفة تحب الرد على الجميع وتوزيع الإيموجي" },
  { name: "عبدالرحمن", style: "شاب رياضي يحب ركض ويلي الرياضة اليومية" },
  { name: "شيخة", style: "أم كبيرة لطيفة تسولف عن الجر والأحفاد" },
  { name: "مبارك", style: "يحب السفر ويشارك تصوراته عن الدول" },
  { name: "حمدان", style: "خفيف الدم يحب النكت والزيح" },
  { name: "فاطمة", style: "تحب مسلسلات الخليج وتنصح بالأعمال" },
] as const;

type Bot = { name: string; style: string; avatar?: string };
export type ChatBotsConfig = { enabled: boolean; replyEnabled: boolean; banterEnabled: boolean; useAi: boolean; bots: Bot[]; replies: string[] };
export const defaultChatBots: ChatBotsConfig = { enabled: true, replyEnabled: true, banterEnabled: true, useAi: true, bots: [...BOTS], replies: [] };

// Owner-editable bot config stored in site_settings("chat_bots"); code list is the fallback.
async function loadConfig(): Promise<ChatBotsConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "chat_bots").maybeSingle();
  const v = (data?.value ?? {}) as Partial<ChatBotsConfig>;
  const bots = Array.isArray(v.bots) ? v.bots.filter((b) => b?.name?.trim()) : [];
  return { ...defaultChatBots, ...v, bots: bots.length ? bots : [...BOTS], replies: Array.isArray(v.replies) ? v.replies.filter(Boolean) : [] };
}
let BOT_POOL: Bot[] = [...BOTS];
const pick = (n: number): Bot[] => { const s = [...BOT_POOL].sort(() => Math.random() - 0.5); return Array.from({ length: n }, (_, i) => s[i % s.length]!); };
// Canned reply when AI is off (or fails) and the owner wrote replies.
function canned(cfg: ChatBotsConfig, author = "") {
  if (!cfg.replies.length) return "";
  return cfg.replies[Math.floor(Math.random() * cfg.replies.length)]!.replaceAll("{name}", author).slice(0, 300);
}
async function say(cfg: ChatBotsConfig, system: string, prompt: string, author = "") {
  const t = cfg.useAi ? await generate(system, prompt) : "";
  return t || canned(cfg, author);
}

async function generate(system: string, prompt: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "";
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const { createLovableAiGatewayRunIdFetch } = await import("@/lib/ai/run-id.server");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createLovableAiGatewayRunIdFetch().fetch,
  });
  let text = "";
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system,
      prompt,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    for await (const chunk of result.textStream) text += chunk;
  } catch { return ""; }
  return text.trim().slice(0, 300);
}

const RULES = "رد بجملة أو جملتين قصيرتين باللهجة السعودية النجدية (لهجة أهل الرياض أو أهل القصيم) بكلمات مثل: وش، ابشر، زين، يا هلا، عساك طيب، بلطف، بدون روابط وبدون اختلاق أخبار أو نتائج. اكتب نص الرسالة فقط بدون اسمك وبدون أي تشكيل أو فتحات أو ضمات أو سكون.";

async function recent(roomId: string | null = null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const query = supabaseAdmin.from("chat_messages").select("display_name, body");
  const { data } = await (roomId ? query.eq("room_id", roomId) : query.is("room_id", null)).order("created_at", { ascending: false }).limit(8);
  return (data ?? []).reverse().map((m) => `${m.display_name ?? "زائر"}: ${m.body}`).join("\n");
}

async function post(name: string, body: string, roomId: string | null = null) {
  body = withoutArabicDiacritics(body);
  if (!body) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("chat_messages").insert({ body, display_name: name, user_id: null, room_id: roomId });
  return !error;
}

// Real registered members' names (non-suspended, named) for bots to address.
async function memberNames() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("display_name").eq("suspended", false).neq("display_name", "").order("last_login_at", { ascending: false, nullsFirst: false }).limit(40);
  return [...new Set((data ?? []).map((r) => r.display_name.trim()).filter(Boolean))];
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const input = z.object({ body: z.string().trim().min(1).max(300), author: z.string().max(30).optional(), messageId: z.string().uuid().optional() });

// Always answer the sender, then sometimes a second bot joins in.
export const botReply = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const cfg = await loadConfig(); BOT_POOL = cfg.bots;
    if (!cfg.enabled || !cfg.replyEnabled) return { ok: false };
    const [a, b] = pick(2) as [Bot, Bot];
    let author = data.author || "زائر";
    let roomId: string | null = null;
    if (data.messageId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin.from("chat_messages").select("display_name,room_id").eq("id", data.messageId).maybeSingle();
      if (!row) return { ok: false };
      roomId = row.room_id;
      if (row?.display_name?.trim()) author = row.display_name.trim();
    }
    const history = await recent(roomId);
    const first = await say(cfg, `أنت ${a.name} في دردشة عامة لموقع المغني لايف. شخصيتك: ${a.style}. رد على ${author} مباشرة وناده باسمه. ${RULES}`, `آخر الرسائل:\n${history}\n\nرد على: ${author}: ${data.body}`, author);
    const ok = await post(a.name, first, roomId);
    if (ok && Math.random() < 0.6) {
      await wait(2500);
      const second = await say(cfg, `أنت ${b.name} في دردشة عامة لموقع المغني لايف. شخصيتك: ${b.style}. علّق على كلام ${author} و${a.name}. ${RULES}`, `${author}: ${data.body}\n${a.name}: ${first}`, author);
      await post(b.name, second, roomId);
    }
    return { ok };
  });

// Bots chatting among themselves.
export const botBanter = createServerFn({ method: "POST" }).handler(async () => {
  const cfg = await loadConfig(); BOT_POOL = cfg.bots;
  if (!cfg.enabled || !cfg.banterEnabled) return { ok: false };
  const [a, b, c] = pick(3) as [Bot, Bot, Bot];
  const history = await recent();
  const names = await memberNames();
  const member = names.length ? names[Math.floor(Math.random() * names.length)] : "";
  const target = member && Math.random() < 0.7 ? member : b.name;
  const m1 = await say(cfg, `أنت ${a.name} في دردشة لموقع المغني لايف. شخصيتك: ${a.style}. ابدأ سالفة أو كمّل على آخر الكلام، ووجّه كلامك لـ${target}${target === member ? " (عضو مسجّل في الموقع، رحّب به أو اسأله عن رأيه)" : ""}. ${RULES}`, `آخر الرسائل:\n${history || "(لا يوجد)"}`);
  if (!(await post(a.name, m1))) return { ok: false };
  await wait(3000);
  const m2 = await say(cfg, `أنت ${b.name}. شخصيتك: ${b.style}. رد على ${a.name}. ${RULES}`, `${a.name}: ${m1}`);
  await post(b.name, m2);
  if (Math.random() < 0.5) {
    await wait(3000);
    const m3 = await say(cfg, `أنت ${c.name}. شخصيتك: ${c.style}. ادخل السالفة وعلّق. ${RULES}`, `${a.name}: ${m1}\n${b.name}: ${m2}`);
    await post(c.name, m3);
  }
  return { ok: true };
});

// Owner posts a message to the public chat under any name (e.g. as a bot).
export const adminPostChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(30), body: z.string().trim().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    return { ok: await post(data.name, data.body) };
  });

// Voice-room turn: one bot speaks ~20 seconds; text is only spoken, never posted to the chat.
const FEMALE = /^(تحب|أم|شابة|هادئة|خفيفة|اجتماعية|عاشقة|لطيفة|طيبة|تتابع|تسأل)/;
const TOPICS = ["القهوة والسهرة مع الصديقات", "طلعات البر والكشتة والمطر", "الطبخ وأكلات نجد مثل الكليجا والجريش", "التسوق والعطور والعود", "السفر وأجمل الأماكن", "المسلسلات الخليجية هالأيام", "ذكريات المدرسة والطفولة", "الشتاء والدفا وليل الرياض", "الأغاني والطرب والسامري", "الرياضة والمشي والصحة", "الأمثال الشعبية القديمة", "العيد ولمة الأهل", "القطط والحيوانات الأليفة", "الأحلام والطموحات", "الصباح الحلو وفنجال القهوة"];
const OPENERS = ["هلا والله ومسهلا، نورتوا الغرفة الصوتية، حياكم الله كلكم، وش أخباركم اليوم؟ عساكم بخير وعافية", "يا هلا ويا مرحبا بالجميع، الله يمسيكم بالخير، وش رايكم نسولف شوي عن المسلسلات اللي تتابعونها هالأيام؟", "مساكم الله بالخير يا جماعة، حياكم في المغني لايف، تفضلوا وخذوا راحتكم والمايك يدور على الكل"];
export async function voiceMonologue(previous = "", heard = "", fast = false, openers: string[] = OPENERS) {
  const cfg = await loadConfig(); BOT_POOL = cfg.bots;
  // Performers use owner recordings in the voice endpoint, never synthesized lyrics.
  let pool = cfg.bots.filter((b) => b.name !== previous && !/[ن]غم|قصيدة/.test(b.name));
  // The opening voice is always a girl's, so the room starts with a soft female voice.
  if (fast) { const girls = pool.filter((b) => FEMALE.test(b.style.trim())); if (girls.length) pool = girls; }
  const bot = pool[Math.floor(Math.random() * pool.length)] ?? { name: "زائرة", style: "شابة ودودة" };
  // Singer girls ("تحب الغناء…") sing a short original verse on some turns instead of talking.
  const sings = !fast && !heard && /^تحب الغناء/.test(bot.style.trim()) && Math.random() < 0.5;
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const text = fast && openers.length ? openers[Math.floor(Math.random() * openers.length)] ?? "هلا بالجميع" : await generate(
    `أنت ${bot.name} في غرفة دردشة صوتية بموقع المغني لايف. شخصيتك: ${bot.style}. تتكلم ${bot.name.length % 2 ? "بلهجة أهل القصيم السعودية (مثل: وشلونك، ابد، يا زين، عاد، هالحين، والله انه)" : "بلهجة أهل الرياض السعودية (مثل: وش السالفة، ابشر، كذا، مره حلو، يا هلا والله)"} بعفوية كأنك تسولف مع الحضور. بدون روابط وبدون اختلاق أخبار أو نتائج، وبدون تشكيل.`,
    sings ? "اكتب أربعة أبيات غنائية قصيرة جديدة من تأليفك بلهجة نجدية عن الحب أو الشوق أو الليل، بدون نسخ أي أغنية معروفة. اكتب الكلمات فقط."
      : `${heard ? `الزائر ${previous || ""} قال لك بالمايك: «${heard}». رد عليه بود وجاوبه ثم ` : previous ? `قبلك تكلم ${previous}، علّق عليه بخفة ثم ` : ""}سولف عن ${topic} بأسلوب شخصيتك لمدة عشرين ثانية تقريبًا (بين 40 و50 كلمة). اكتب الكلام فقط.`,
  );
  return { name: bot.name, female: FEMALE.test(bot.style.trim()), mode: (sings ? "sing" : "talk") as "talk" | "sing" | "poem", text: withoutArabicDiacritics(text || canned(cfg) || "هلا والله بالجميع، نورتوا الغرفة الصوتية") };
}
