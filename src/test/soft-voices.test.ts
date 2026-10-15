import { describe, expect, it } from "vitest";
import { FEMALE_VOICE_PROFILES, MELODIES, normalizeVoiceChat, providerVoiceId, singDelivery, singFallbacks, voiceDelivery, voiceCategory, FEMALE_VOICE_CATEGORIES, VOICE_LIST } from "@/lib/voice-config";

describe("soft female voice presets", () => {
  it("groups fourteen adult regional performances with distinct supported voices", () => {
    const added = FEMALE_VOICE_PROFILES.filter((v) => ["أصوات سعودية", "لهجات عربية"].includes(voiceCategory(v.id)));
    expect(added).toHaveLength(14);
    expect(added.filter((v) => voiceCategory(v.id) === "أصوات سعودية")).toHaveLength(8);
    expect(FEMALE_VOICE_CATEGORIES[0]).toBe("أصوات سعودية");
    expect(new Set(added.map((v) => providerVoiceId(v.id))).size).toBe(14);
    for (const v of added) {
      expect(v.delivery).toContain("امرأة بالغة");
      expect(VOICE_LIST.some((base) => !base.providerId && base.female && base.id === providerVoiceId(v.id))).toBe(true);
      expect(voiceDelivery(v.id)).toContain(v.delivery);
      expect(normalizeVoiceChat({ femaleVoices: [v.id], botVoices: { test: v.id }, say: { id: "test", text: "هلا", voice: v.id } }).say?.voice).toBe(v.id);
    }
    expect(voiceDelivery("female-egyptian-salma")).not.toContain("بلهجة سعودية");
  });
  it("offers original soft Gulf singing and keeps its directions on transient retries", () => {
    expect(MELODIES.find((m) => m.id === "soft-gulf")?.label).toBe("غناء نسائي خليجي ناعم");
    const directions = singDelivery("soft-gulf", "slow");
    expect(directions).toContain("امرأة بالغة");
    expect(directions).toContain("لحنا أصليا");
    expect(directions).toContain("إيقاع بطيء حالم");
    expect(singFallbacks("soft-gulf", "slow")).toEqual([directions, directions]);
  });
  it("keeps distinct delivery profiles and persists the selected bot voice", () => {
    const ids = ["female-raheel", "female-areej", "female-hatoon", "female-taleen"];
    const providers = new Set<string>();
    const deliveries = new Set<string>();
    for (const id of ids) {
      const profile = FEMALE_VOICE_PROFILES.find((voice) => voice.id === id);
      expect(profile?.female).toBe(true);
      expect(voiceDelivery(id)).toContain("امرأة بالغة");
      providers.add(providerVoiceId(id));
      deliveries.add(voiceDelivery(id));
      expect(normalizeVoiceChat({ botVoices: { نورة: id } }).botVoices['نورة']).toBe(id);
    }
    expect(providers.size).toBe(ids.length);
    expect(deliveries.size).toBe(ids.length);
  });
});