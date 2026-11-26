import { describe, expect, it } from "vitest";
import {
  contrastOnHex,
  defaultAiPageConfig,
  normalizeAiPageConfig,
  resolvedAiLogoSrc,
  safeAiLogoPath,
  safeAiLogoUrl,
} from "./ai-page-config";

describe("ai-page-config normalization", () => {
  it("uses black-and-gold defaults when nothing is saved yet", () => {
    const cfg = normalizeAiPageConfig(undefined);
    expect(cfg.brandTitle).toBe("ALMOGHANI AI");
    expect(cfg.themePreset).toBe("gold-dark");
    expect(cfg.fontFamily).toBe("Cairo");
    expect(cfg.sections).toHaveLength(4);
    expect(resolvedAiLogoSrc(cfg)).toBe("/icon-192.png");
  });

  it("preserves an explicitly emptied sections list so deleted sections stay gone", () => {
    const cfg = normalizeAiPageConfig({ sections: [] });
    expect(cfg.sections).toEqual([]);
  });

  it("keeps added custom sections and falls back prompt to title", () => {
    const cfg = normalizeAiPageConfig({
      sections: [{ id: "sec-new", title: "قنوات الرياضة", prompt: "" }],
    });
    expect(cfg.sections).toEqual([
      { id: "sec-new", title: "قنوات الرياضة", prompt: "قنوات الرياضة" },
    ]);
  });

  it("validates colors, presets, layout, and allow-listed fonts", () => {
    const valid = normalizeAiPageConfig({
      themePreset: "royal-blue",
      layoutStyle: "list",
      fontFamily: "Tajawal",
      accentColor: "#38BDF8",
      bgColor: "#091120",
      textColor: "#f1f6fc",
    });
    expect(valid.themePreset).toBe("royal-blue");
    expect(valid.layoutStyle).toBe("list");
    expect(valid.fontFamily).toBe("Tajawal");
    expect(valid.accentColor).toBe("#38bdf8");

    const invalid = normalizeAiPageConfig({
      themePreset: "hacked",
      fontFamily: "Comic Sans",
      accentColor: "red",
    });
    expect(invalid.themePreset).toBe("gold-dark");
    expect(invalid.fontFamily).toBe("Cairo");
    expect(invalid.accentColor).toBe(defaultAiPageConfig.accentColor);
  });

  it("restricts logo paths and URLs to safe values", () => {
    expect(safeAiLogoPath("ai-logo-abcdef123456.png")).toBe("ai-logo-abcdef123456.png");
    expect(safeAiLogoPath("../secret.png")).toBe("");
    expect(safeAiLogoUrl("https://almoghani.net/logo.png")).toBe("https://almoghani.net/logo.png");
    expect(safeAiLogoUrl("javascript:alert(1)")).toBe("");
    expect(
      resolvedAiLogoSrc({ logoPath: "ai-logo-abcdef123456.png", logoUrl: "https://example.com/a.png" }),
    ).toBe("/api/public/ai-logo?path=ai-logo-abcdef123456.png");
  });

  it("computes readable foreground contrast on bright and dark accent colors", () => {
    expect(contrastOnHex("#d4a62a")).toBe("#111111");
    expect(contrastOnHex("#1e3a8a")).toBe("#ffffff");
  });
  it("preserves section descriptions, icons and owner ordering", () => {
    const cfg = normalizeAiPageConfig({ sections: [{ id: "second", title: "الثاني", description: "وصف", icon: "book" }, { id: "first", title: "الأول", icon: "tv" }] });
    expect(cfg.sections.map((s) => s.id)).toEqual(["second", "first"]);
    expect(cfg.sections[0]?.description).toBe("وصف");
    expect(cfg.sections[0]?.icon).toBe("book");
  });
  it("persists the Arabic fonts and chosen font size", () => {
    for (const fontFamily of ["Cairo", "Tajawal", "IBM Plex Sans Arabic"]) {
      const cfg = normalizeAiPageConfig({ fontFamily, fontSize: 20 });
      expect(cfg.fontFamily).toBe(fontFamily);
      expect(cfg.fontSize).toBe(20);
    }
  });
  it("persists contact settings without permitting URL injection", () => {
    const cfg = normalizeAiPageConfig({ contactEmail: "ahmed@almoghani.net", contactWhatsapp: "+966 557073007", contactX: "Op430" });
    expect(cfg.contactEmail).toBe("ahmed@almoghani.net");
    expect(cfg.contactWhatsapp).toBe("966557073007");
    expect(normalizeAiPageConfig({ contactWhatsapp: "javascript:alert(1)" }).contactWhatsapp).toBe("1");
  });
});