// Owner-editable look, texts and voice list of the /22 panel, stored in site_settings("voice_panel").
import { FEMALE_VOICE_PROFILES, VOICE_LIST } from "@/lib/voice-config";

export const PANEL_TEXT_FIELDS = [
  { key: "textLabel", label: "عنوان مربع النص", fallback: "اكتب النص الذي يقوله البوت" },
  { key: "placeholder", label: "النص داخل المربع", fallback: "اكتب النص هنا..." },
  { key: "voiceLabel", label: "عنوان اختيار الصوت", fallback: "اختيار صوت بنت" },
  { key: "singLabel", label: "عبارة الغناء", fallback: "خلّها تغني الكلام بدل ما تقوله" },
  { key: "testBtn", label: "زر التجربة", fallback: "تجريب الصوت" },
  { key: "downloadBtn", label: "زر الحفظ في الجوال", fallback: "حفظ الصوت في جوالي" },
  { key: "saveBtn", label: "زر الحفظ الذهبي", fallback: "حفظ اختيار البوت" },
] as const;
export const PANEL_COLOR_FIELDS = [
  { key: "bg", label: "لون الخلفية", fallback: "#05050d" },
  { key: "text", label: "لون النصوص", fallback: "#f5f0e1" },
  { key: "accent", label: "لون الإطارات والأزرار", fallback: "#8b5cf6" },
  { key: "gold", label: "لون الزر الذهبي", fallback: "#d4a62a" },
] as const;
type TextKey = (typeof PANEL_TEXT_FIELDS)[number]["key"];
type ColorKey = (typeof PANEL_COLOR_FIELDS)[number]["key"];
export type CustomVoice = { id: string; name: string; label: string; providerId: string; delivery: string };
export type VoicePanelConfig = {
  texts: Record<TextKey, string>;
  colors: Record<ColorKey, string> & { enabled: boolean };
  showHeader: boolean;
  hidden: string[];
  custom: CustomVoice[];
};
export const FEMALE_PROVIDERS = VOICE_LIST.filter((v) => v.female && !v.providerId).map((v) => ({ id: v.id, label: `${v.name} · ${v.label}` }));
const providerIds = new Set(FEMALE_PROVIDERS.map((p) => p.id));
const builtinIds = new Set(FEMALE_VOICE_PROFILES.map((v) => v.id));
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[<>{}\\]/g, "").trim().slice(0, max) : "");

export function normalizeVoicePanel(raw: unknown): VoicePanelConfig {
  const o = (raw ?? {}) as Partial<VoicePanelConfig>;
  const texts = {} as Record<TextKey, string>;
  for (const f of PANEL_TEXT_FIELDS) texts[f.key] = clean(o.texts?.[f.key], 80) || f.fallback;
  const colors = { enabled: o.colors?.enabled === true } as VoicePanelConfig["colors"];
  for (const f of PANEL_COLOR_FIELDS) { const c = o.colors?.[f.key]; colors[f.key] = typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : f.fallback; }
  const custom = Array.isArray(o.custom) ? o.custom.filter((c) => c && typeof c.id === "string" && /^custom-[a-z0-9]{4,20}$/.test(c.id) && providerIds.has(c.providerId)).slice(0, 60)
    .map((c) => ({ id: c.id, name: clean(c.name, 30) || "صوت", label: clean(c.label, 40), providerId: c.providerId, delivery: clean(c.delivery, 300) })) : [];
  const hidden = Array.isArray(o.hidden) ? o.hidden.filter((h): h is string => typeof h === "string" && builtinIds.has(h)) : [];
  return { texts, colors, showHeader: o.showHeader !== false, hidden, custom };
}
export const defaultVoicePanel = normalizeVoicePanel({});
