import { z } from "zod";

export const aiMessageSchema = z.object({ id: z.string().max(80), role: z.enum(["user", "assistant"]), content: z.string().max(60000) });
export const aiConversationSchema = z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(120), messages: z.array(aiMessageSchema).max(30), updated_at: z.string() });
export type AiConversation = z.infer<typeof aiConversationSchema>;
export type AiChatMessage = z.infer<typeof aiMessageSchema>;
export const aiContactSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(120), message: z.string().trim().min(3).max(4000), website: z.string().max(200).optional() });
export function parseAiLibrary(raw: unknown): AiConversation[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => { const result = aiConversationSchema.safeParse(item); return result.success ? [result.data] : []; });
}
export function downloadAiText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}