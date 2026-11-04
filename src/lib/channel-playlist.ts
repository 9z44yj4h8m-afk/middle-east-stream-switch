import parser from "iptv-playlist-parser";
import type { ChannelCategory } from "./channels";

export type PlaylistChannel = { name: string; url: string; logo: string; category: ChannelCategory };

/** Public catalogs must never receive credential-bearing private IPTV streams. */
export function publicChannelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && ![...url.searchParams.keys()].some((key) => /^(username|password|token|auth|key|apikey|access_token)$/i.test(key))
      && !/^\/(live|movie|series)\/[^/]+\/[^/]+\/\d+(?:\.[a-z0-9]+)?$/i.test(url.pathname)
      && !/\/(get|player_api)\.php$/i.test(url.pathname);
  } catch { return false; }
}

export function playlistCategory(group: string): ChannelCategory {
  if (/news|أخبار|اخبار|إخبار/i.test(group)) return "إخبارية";
  if (/sport|رياض|ssc|bein/i.test(group)) return "رياضية";
  if (/islam|quran|relig|إسلام|اسلام|قرآن|قران/i.test(group)) return "إسلامية";
  if (/kids|child|document|أطفال|اطفال|وثائق/i.test(group)) return "أطفال ووثائقي";
  if (/movie|cinema|film|دراما|مسلس|أفلام|افلام/i.test(group)) return "مسلسلات وأفلام";
  return "عامة";
}

export function readChannelPlaylist(text: string): { channels: PlaylistChannel[]; skipped: number } {
  if (text.length > 2_000_000 || !text.replace(/^\uFEFF/, "").trimStart().startsWith("#EXTM3U")) throw new Error("اختر ملف M3U صحيحًا لا يتجاوز 2 ميجابايت.");
  const items = parser.parse(text.replace(/^\uFEFF/, "")).items;
  const seen = new Set<string>();
  const channels: PlaylistChannel[] = [];
  for (const item of items) {
    const url = item.url.trim();
    if (!item.name.trim() || !publicChannelUrl(url) || url.length > 1000 || seen.has(url)) continue;
    seen.add(url);
    channels.push({ name: item.name.trim().slice(0, 80), url, logo: /^https:\/\//.test(item.tvg.logo) && publicChannelUrl(item.tvg.logo) ? item.tvg.logo.slice(0, 1000) : "", category: playlistCategory(item.group.title) });
  }
  return { channels: channels.slice(0, 500), skipped: items.length - Math.min(channels.length, 500) };
}