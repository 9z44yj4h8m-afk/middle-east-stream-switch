import { describe, it, expect } from "vitest";
import { aiContactSchema, parseAiLibrary } from "./ai-workspace";
describe("AI library and contact data", () => {
  it("restores complete conversations with generated outputs", () => {
    const library = parseAiLibrary([{ id: "11111111-1111-4111-8111-111111111111", title: "سؤال محفوظ", updated_at: "2026-11-26T03:00:00Z", messages: [{ id: "u1", role: "user", content: "مرحبا" }, { id: "a1", role: "assistant", content: "رد محفوظ" }] }]);
    expect(library[0]?.messages[1]?.content).toBe("رد محفوظ");
    expect(library[0]?.title).toBe("سؤال محفوظ");
  });
  it("rejects malformed saved conversation records", () => { expect(parseAiLibrary([{ id: "bad", messages: "bad" }])).toEqual([]); });
  it("requires a sender name, a real email and a message", () => {
    expect(aiContactSchema.safeParse({ name: "أحمد", email: "ahmed@example.com", message: "رسالة للمالك" }).success).toBe(true);
    expect(aiContactSchema.safeParse({ name: "أحمد", email: "invalid", message: "رسالة للمالك" }).success).toBe(false);
  });
});