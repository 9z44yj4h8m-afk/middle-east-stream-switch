import { describe, expect, it } from "vitest";
import { orderedSectionIds, getSectionCard, defaultSectionContent } from "@/lib/section-content";
import { FEMALE_VOICE_PROFILES, normalizeVoiceChat, providerVoiceId, VOICE_LIST, voiceDelivery } from "@/lib/voice-config";

describe("admin content controls", () => {
  it("preserves distinct female profiles and resolves supported synthesis voices", () => {
    expect(FEMALE_VOICE_PROFILES).toHaveLength(10);
    expect(new Set(FEMALE_VOICE_PROFILES.map((v) => v.delivery)).size).toBe(10);
    for (const v of FEMALE_VOICE_PROFILES) {
      expect(VOICE_LIST.some((base) => !base.providerId && base.id === providerVoiceId(v.id))).toBe(true);
      expect(voiceDelivery(v.id)).toContain(v.delivery);
      const cfg = normalizeVoiceChat({ femaleVoices: [v.id], botVoices: { girl: v.id }, say: { id: "test", text: "هلا", voice: v.id } });
      expect(cfg.femaleVoices).toEqual([v.id]);
      expect(cfg.botVoices["girl"]).toBe(v.id);
      expect(cfg.say?.voice).toBe(v.id);
    }
    expect(providerVoiceId("Despina")).toBe("Despina");
  });
  it("names female voices and applies gentle delivery", () => {
    const girls = VOICE_LIST.filter((v) => v.female);
    expect(new Set(girls.map((v) => v.name)).size).toBe(girls.length);
    for (const v of girls) expect(voiceDelivery(v.id)).toContain("حنون");
    expect(voiceDelivery("Puck")).not.toContain("بنت");
    expect(normalizeVoiceChat({ botVoices: { "ღ دلال ღ": "Despina" } }).botVoices["ღ دلال ღ"]).toBe("Despina");
  });
  it("keeps valid saved order and fills missing cards without duplicates", () => {
    expect(orderedSectionIds("sections", ["a", "b", "c"], { ...defaultSectionContent, orders: { sections: ["c", "c", "invalid", "a"] } })).toEqual(["c", "a", "b"]);
  });
  it("retains hidden state and refuses unapproved destinations", () => {
    const card = getSectionCard("sections-live", { ...defaultSectionContent, cards: { "sections-live": { hidden: true, link: "https://unapproved.example" } } });
    expect(card.hidden).toBe(true);
    expect(card.link).toBe("/live");
  });
  it("only accepts configured recording paths", () => {
    const cfg = normalizeVoiceChat({ clips: [
      { id: "one", name: "سلمى", path: "recordings/abc-123.mp3", enabled: true },
      { id: "two", name: "bad", path: "../private.mp3", enabled: true },
      { id: "three", name: "off", path: "recordings/def.wav", enabled: false },
    ] });
    expect(cfg.clips).toHaveLength(2);
    expect(cfg.clips[1]?.enabled).toBe(false);
    expect(normalizeVoiceChat({}).clips).toEqual([]);
  });
});