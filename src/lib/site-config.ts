import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { channels as baseChannels, type Channel, type ChannelCategory } from "./channels";
import type { Movie } from "./movies";
import { defaultSectionContent, type SectionContent } from "./section-content";
import { defaultChatAppearance, normalizeChatAppearance, type ChatAppearance } from "./chat-appearance";

export type SiteTexts = { bannerTitle: string; bannerSubtitle: string; proLabel: string; siteName?: string; libraryLink?: string; chatImage?: string };
/** Only same-site paths are allowed for the library button so the owner setting can never send visitors off-site. */
export const safeLibraryLink = (v?: string) => (v && /^\/(?!\/)[\w\-/?=&%.]*$/.test(v) ? v : "/vip");
export const safeHttpsImage = (v?: string) => (v && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : "");
export type SiteContacts = { whatsapp: string; email: string; snapchat: string; x: string; instagram: string };
export type SiteDesign = { primary: string; accent: string; background: string; fontBody?: string; fontHeading?: string; fontScale?: number; colors?: Record<string, string>; radius?: number };
export const designColorFields = [
  { key: "background", label: "لون الخلفية", def: "#0b1424", vars: ["--background", "--surface-deep"] },
  { key: "card", label: "لون البطاقات", def: "#111c2e", vars: ["--card", "--surface"] },
  { key: "foreground", label: "لون النص", def: "#f3f5fb", vars: ["--foreground", "--card-foreground"] },
  { key: "muted", label: "لون النص الثانوي", def: "#9aa8d6", vars: ["--muted-foreground"] },
  { key: "border", label: "لون الحدود", def: "#4a5d8a", vars: ["--border", "--input"] },
  { key: "secondary", label: "لون الأزرار الثانوية", def: "#1a2740", vars: ["--secondary", "--muted"] },
  { key: "gradient", label: "لون تدرّج الأزرار", def: "#c1272d", vars: ["--vip-purple"] },
  { key: "live", label: "لون شارة مباشر", def: "#e0242f", vars: ["--live", "--signal"] },
] as const;
export const siteFonts = ["Cairo", "Tajawal", "Almarai", "IBM Plex Sans Arabic", "Noto Kufi Arabic", "Changa", "Readex Pro", "El Messiri"] as const;

export type SiteAd = { enabled: boolean; image: string; link: string };
export type SiteTicker = { enabled: boolean; text: string };
export type SiteChat = { enabled: boolean };
export const defaultAd: SiteAd = { enabled: true, image: "", link: "/movies" };
export const defaultTicker: SiteTicker = { enabled: true, text: "شاهد القنوات المباشرة والأفلام والقنوات المميزة على ALMOGHANI — للاشتراك تواصل واتساب 0557073007" };
export const defaultChat: SiteChat = { enabled: true };

export const defaultTexts: SiteTexts = { bannerTitle: "almoghani smarter", bannerSubtitle: "جميع القنوات", proLabel: "Almoghani Smarter pro" };
export const defaultContacts: SiteContacts = { whatsapp: "0557073007", email: "ahmed@almoghani.net", snapchat: "Ls460g", x: "Op430", instagram: "" };
export const defaultDesign: SiteDesign = { primary: "", accent: "", background: "" };

export const channelCategories: ChannelCategory[] = ["إخبارية", "رياضية", "إسلامية", "مسلسلات وأفلام", "أفلام كاملة", "أطفال ووثائقي", "عامة"];

export type SiteConfig = {
  texts: SiteTexts;
  contacts: SiteContacts;
  design: SiteDesign;
  ad: SiteAd;
  ticker: SiteTicker;
  chat: SiteChat;
  chatAppearance: ChatAppearance;
  botAvatars: Record<string, string>;
  chatNames: string[];
  botNameAliases: Record<string, string>;
  sectionContent: SectionContent;
  customChannels: { id: string; name: string; category: string; stream_url: string; logo: string; description: string }[];
  overrides: { channel_id: string; hidden: boolean; category: string | null; name: string | null }[];
  customMovies: { id: string; youtube_id: string; title: string; description: string }[];
  hiddenMovies: string[];
};

async function fetchSiteConfig(): Promise<SiteConfig> {
  const [settings, custom, overrides, movies, hidden] = await Promise.all([
    supabase.from("site_settings").select("key,value"),
    supabase.from("custom_channels").select("id,name,category,stream_url,logo,description").order("created_at"),
    supabase.from("channel_overrides").select("channel_id,hidden,category,name"),
    supabase.from("custom_movies").select("id,youtube_id,title,description").order("created_at", { ascending: false }),
    supabase.from("hidden_movies").select("movie_id"),
  ]);
  const get = <T,>(key: string, fallback: T): T => {
    const row = settings.data?.find((r) => r.key === key);
    return { ...fallback, ...((row?.value as Partial<T>) ?? {}) };
  };
  return {
    texts: get("texts", defaultTexts),
    contacts: get("contacts", defaultContacts),
    design: get("design", defaultDesign),
    ad: get("ad", defaultAd),
    ticker: get("ticker", defaultTicker),
    chat: get("chat", defaultChat),
    chatAppearance: normalizeChatAppearance(get("chat-appearance", defaultChatAppearance)),
    botAvatars: Object.fromEntries(((settings.data?.find((r) => r.key === "chat_bots")?.value as { bots?: { name: string; avatar?: string }[] } | undefined)?.bots ?? []).filter((b) => b.name && b.avatar).map((b) => [b.name, b.avatar ?? ""])),
    chatNames: ((settings.data?.find((r) => r.key === "chat_bots")?.value as { bots?: { name: string }[] } | undefined)?.bots ?? []).map((b) => b.name).filter(Boolean),
    botNameAliases: Object.fromEntries(((settings.data?.find((r) => r.key === "chat_bots")?.value as { bots?: { name: string; aliases?: string[] }[] } | undefined)?.bots ?? []).flatMap((b) => (b.aliases ?? []).map((alias) => [alias, b.name]))),
    sectionContent: get("section-content", defaultSectionContent),
    customChannels: custom.data ?? [],
    overrides: overrides.data ?? [],
    customMovies: movies.data ?? [],
    hiddenMovies: (hidden.data ?? []).map((r) => r.movie_id),
  };
}

export const siteConfigKey = ["site-config"] as const;

export function useSiteConfig() {
  return useQuery({ queryKey: siteConfigKey, queryFn: fetchSiteConfig, staleTime: 60_000 });
}

export function youtubeIdFrom(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(url) ? url : null);
}

export function mergeChannels(config: SiteConfig | undefined): Channel[] {
  if (!config) return baseChannels;
  const ov = new Map(config.overrides.map((o) => [o.channel_id, o]));
  const base = baseChannels
    .filter((c) => !ov.get(c.id)?.hidden)
    .map((c) => {
      const o = ov.get(c.id);
      const cat = o?.category;
      const named = o?.name ? { ...c, name: o.name } : c;
      return cat && channelCategories.includes(cat as ChannelCategory) ? { ...named, category: cat as ChannelCategory } : named;
    });
  const extra: Channel[] = config.customChannels
    .filter((c) => !ov.get(c.id)?.hidden)
    .map((c) => {
      const yt = youtubeIdFrom(c.stream_url);
      return {
        id: c.id,
        name: c.name,
        category: (channelCategories.includes(c.category as ChannelCategory) ? c.category : "عامة") as ChannelCategory,
        ...(yt ? { youtubeId: yt } : { streamUrl: c.stream_url }),
        thumbnail: c.logo || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : ""),
        description: c.description || "بث مباشر",
      };
    });
  return [...base, ...extra];
}

/** Full catalog with admin changes applied; falls back to the built-in list while loading. */
export function useCatalog(): Channel[] {
  const { data } = useSiteConfig();
  return mergeChannels(data);
}

export function applyMovieConfig(movies: Movie[], config: SiteConfig | undefined): Movie[] {
  if (!config) return movies;
  const hidden = new Set(config.hiddenMovies);
  const extra: Movie[] = config.customMovies.map((m) => ({
    id: `custom-${m.id}`,
    youtubeId: m.youtube_id,
    title: m.title,
    duration: "فيلم كامل",
    description: m.description,
    source: "ALMOGHANI",
    lang: "عربي",
  } as Movie));
  return [...extra, ...movies.filter((m) => !hidden.has(m.id))];
}
