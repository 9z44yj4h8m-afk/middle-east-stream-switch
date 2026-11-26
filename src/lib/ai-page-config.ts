import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AiSectionItem = {
  id: string;
  title: string;
  prompt: string;
  description?: string;
  icon?: string;
};

export type AiLayoutStyle = "cards" | "list";

export type AiThemePresetId =
  | "gold-dark"
  | "royal-blue"
  | "emerald-dark"
  | "burgundy-gold"
  | "clean-light"
  | "custom";

export type AiPageConfig = {
  brandTitle: string;
  brandSubtitle: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  inputPlaceholder: string;
  homeLabel: string;
  newChatLabel: string;
  logoUrl: string;
  logoPath: string;
  themePreset: AiThemePresetId;
  layoutStyle: AiLayoutStyle;
  fontFamily: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  headingColor: string;
  sections: AiSectionItem[];
  fontSize: number;
  contactEmail: string;
  contactWhatsapp: string;
  contactX: string;
  contactSnapchat: string;
};

export const AI_FONTS = [
  { value: "Cairo", label: "القاهرة (Cairo)" },
  { value: "Tajawal", label: "تجول (Tajawal)" },
  { value: "Almarai", label: "المراعي (Almarai)" },
  { value: "IBM Plex Sans Arabic", label: "آي بي إم عربي" },
  { value: "Noto Kufi Arabic", label: "كوفي (Noto Kufi)" },
  { value: "Changa", label: "تشانغا (Changa)" },
  { value: "Readex Pro", label: "ريدكس (Readex)" },
  { value: "El Messiri", label: "المسيري (El Messiri)" },
  { value: "Amiri Quran", label: "أميري كلاسيكي" },
] as const;

export const AI_THEME_PRESETS: {
  id: Exclude<AiThemePresetId, "custom">;
  label: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  headingColor: string;
}[] = [
  {
    id: "gold-dark",
    label: "أسود وذهبي (الأصل)",
    accentColor: "#d4a62a",
    bgColor: "#0e0d0a",
    surfaceColor: "#1b1913",
    textColor: "#f6f3ea",
    mutedTextColor: "#b8ae95",
    headingColor: "#e6be4c",
  },
  {
    id: "royal-blue",
    label: "كحلي وسماوي",
    accentColor: "#38bdf8",
    bgColor: "#091120",
    surfaceColor: "#122038",
    textColor: "#f1f6fc",
    mutedTextColor: "#9bb2d4",
    headingColor: "#7dd3fc",
  },
  {
    id: "emerald-dark",
    label: "زمردي داكن",
    accentColor: "#22c55e",
    bgColor: "#08140f",
    surfaceColor: "#11241c",
    textColor: "#eefaf3",
    mutedTextColor: "#9bc2ad",
    headingColor: "#4ade80",
  },
  {
    id: "burgundy-gold",
    label: "عنابي وذهبي",
    accentColor: "#e2b144",
    bgColor: "#1b090e",
    surfaceColor: "#2c1119",
    textColor: "#fcf4f5",
    mutedTextColor: "#d3adb5",
    headingColor: "#f2c968",
  },
  {
    id: "clean-light",
    label: "فاتح وأنيق",
    accentColor: "#b48312",
    bgColor: "#f7f5ef",
    surfaceColor: "#ffffff",
    textColor: "#171511",
    mutedTextColor: "#635c4d",
    headingColor: "#966909",
  },
];

export const DEFAULT_AI_SECTIONS: AiSectionItem[] = [
  { id: "sec-1", title: "اقترح لي قنوات أخبار ورياضة مباشرة", prompt: "اقترح لي قنوات أخبار ورياضة مباشرة" },
  { id: "sec-2", title: "أرشدني إلى سورة الكهف", prompt: "أرشدني إلى سورة الكهف" },
  { id: "sec-3", title: "ما أبرز المسلسلات البدوية والأفلام؟", prompt: "ما أبرز المسلسلات البدوية والأفلام؟" },
  { id: "sec-4", title: "ساعدني في كتابة نص أو فكرة احترافية", prompt: "ساعدني في كتابة نص أو فكرة احترافية" },
];

export const DEFAULT_AI_LOGO = "/icon-192.png";

const HEX_RE = /^#[0-9a-f]{6}$/i;
const ALLOWED_FONTS = new Set<string>(AI_FONTS.map((f) => f.value));
const ALLOWED_PRESETS = new Set<string>([...AI_THEME_PRESETS.map((p) => p.id), "custom"]);

const cleanText = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[<>{}\\]/g, "").trim().slice(0, max) : "";

const pickHex = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toLowerCase() : fallback;

export function safeAiLogoPath(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const p = raw.trim();
  return /^ai-logo-[a-z0-9_-]{8,64}\.(png|jpe?g|webp|gif)$/i.test(p) ? p : "";
}

export function safeAiLogoUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const u = raw.trim();
  if (u === DEFAULT_AI_LOGO) return u;
  if (/^https:\/\/[^\s"'<>]{6,500}$/.test(u)) return u;
  return "";
}

export function resolvedAiLogoSrc(cfg: Pick<AiPageConfig, "logoPath" | "logoUrl">): string {
  const path = safeAiLogoPath(cfg.logoPath);
  if (path) return `/api/public/ai-logo?path=${encodeURIComponent(path)}`;
  return safeAiLogoUrl(cfg.logoUrl) || DEFAULT_AI_LOGO;
}

export function contrastOnHex(hex: string): string {
  if (!HEX_RE.test(hex)) return "#111111";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.56 ? "#111111" : "#ffffff";
}

export function normalizeAiPageConfig(raw: unknown): AiPageConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<AiPageConfig>;
  const base = AI_THEME_PRESETS[0];
  if (!base) throw new Error("Missing AI theme");
  const themePreset = (
    typeof o.themePreset === "string" && ALLOWED_PRESETS.has(o.themePreset)
      ? o.themePreset
      : "gold-dark"
  ) as AiThemePresetId;
  const fontFamily =
    typeof o.fontFamily === "string" && ALLOWED_FONTS.has(o.fontFamily) ? o.fontFamily : "Cairo";
  const layoutStyle: AiLayoutStyle = o.layoutStyle === "list" ? "list" : "cards";

  let sections: AiSectionItem[];
  if (Array.isArray(o.sections)) {
    sections = o.sections
      .filter((s): s is AiSectionItem => !!s && typeof s === "object")
      .map((s, idx) => {
        const title = cleanText(s.title, 120);
        const prompt = cleanText(s.prompt, 300) || title;
        const id =
          typeof s.id === "string" && /^[a-z0-9_-]{2,40}$/i.test(s.id)
            ? s.id
            : `sec-${idx + 1}`;
        return { id, title, prompt, ...(s.description ? { description: cleanText(s.description, 240) } : {}), ...(s.icon ? { icon: ["sparkles", "book", "tv", "pen", "globe"].includes(s.icon) ? s.icon : "sparkles" } : {}) };
      })
      .filter((s) => s.title.length > 0)
      .slice(0, 30);
  } else {
    sections = DEFAULT_AI_SECTIONS;
  }

  return {
    brandTitle: cleanText(o.brandTitle, 50) || "ALMOGHANI AI",
    brandSubtitle: cleanText(o.brandSubtitle, 60) || "المساعد الذكي",
    welcomeTitle: cleanText(o.welcomeTitle, 60) || "ALMOGHANI AI",
    welcomeSubtitle:
      cleanText(o.welcomeSubtitle, 240) ||
      "اسألني عن القنوات المباشرة، الأفلام، المسلسلات البدوية، القرآن الكريم، أو أي سؤال عام.",
    inputPlaceholder: cleanText(o.inputPlaceholder, 90) || "اكتب سؤالك هنا…",
    homeLabel: cleanText(o.homeLabel, 24) || "الرئيسية",
    newChatLabel: cleanText(o.newChatLabel, 24) || "جديدة",
    logoUrl: safeAiLogoUrl(o.logoUrl),
    logoPath: safeAiLogoPath(o.logoPath),
    themePreset,
    layoutStyle,
    fontFamily,
    accentColor: pickHex(o.accentColor, base.accentColor),
    bgColor: pickHex(o.bgColor, base.bgColor),
    surfaceColor: pickHex(o.surfaceColor, base.surfaceColor),
    textColor: pickHex(o.textColor, base.textColor),
    mutedTextColor: pickHex(o.mutedTextColor, base.mutedTextColor),
    headingColor: pickHex(o.headingColor, base.headingColor),
    sections,
    fontSize: typeof o.fontSize === "number" && Number.isFinite(o.fontSize) ? Math.min(24, Math.max(12, Math.round(o.fontSize))) : 16,
    contactEmail: typeof o.contactEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.contactEmail) ? o.contactEmail.slice(0, 120) : "ahmed@almoghani.net",
    contactWhatsapp: typeof o.contactWhatsapp === "string" ? o.contactWhatsapp.replace(/\D/g, "").slice(0, 15) : "966557073007",
    contactX: cleanText(o.contactX, 40).replace(/[^a-z0-9_]/gi, "") || "Op430",
    contactSnapchat: cleanText(o.contactSnapchat, 40).replace(/[^a-z0-9_.-]/gi, "") || "Ls460g",
  };
}

export const defaultAiPageConfig: AiPageConfig = normalizeAiPageConfig({});
export const aiPageConfigKey = ["ai-page-config"] as const;

export function useAiPageConfig() {
  return useQuery({
    queryKey: aiPageConfigKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "ai_page")
        .maybeSingle();
      return normalizeAiPageConfig(data?.value);
    },
    staleTime: 30_000,
  });
}