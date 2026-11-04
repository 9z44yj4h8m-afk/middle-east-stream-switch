import type { Channel } from "./channels";
import type { Movie } from "./movies";
import type { BedouinSeries } from "./bedouin-series";

export type IptvView = "live" | "movies" | "series" | "favorites";
export function publicIptvChannels(channels: Channel[]) {
  return channels.filter((c) => !!(c.streamUrl || c.youtubeId || c.youtubeChannelId));
}
export function favoriteCatalog(channels: Channel[], movies: Movie[], series: BedouinSeries[], favorites: string[]) {
  const saved = new Set(favorites);
  return { channels: channels.filter((c) => saved.has(`live:${c.id}`)), movies: movies.filter((m) => saved.has(`movie:${m.id}`)), series: series.filter((s) => saved.has(`series:${s.id}`)) };
}