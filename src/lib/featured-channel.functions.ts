import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { featuredChannels } from "./featured-channels";
import { featuredLogos } from "./featured-logos";

const ALIASES: Record<string, string[]> = {
  "abu-dhabi-sports": ["abudhabi", "أبوظبي", "ابوظبي"],
  alkass: ["alkass", "الكاس", "الكأس"],
  shahid: ["shahid", "شاهد"],
};
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const getFeaturedChannels = createServerFn({ method: "GET" }).handler(async () => {
  const { loadKind } = await import("./iptv/library.server");
  type Rows = Awaited<ReturnType<typeof loadKind>>;
  const rowsByKind = new Map<string, Rows>();
  const items: Array<(typeof featuredChannels)[number] & { logo: string; available: boolean }> = [];
  for (const channel of featuredChannels) {
    let rows = rowsByKind.get(channel.kind);
    if (!rows) {
      rows = await loadKind(channel.kind);
      rowsByKind.set(channel.kind, rows);
    }
    const terms = ALIASES[channel.id] ?? [channel.query];
    const row = rows.find((entry) =>
      terms.some((term) => normalize(channel.kind === "live" ? entry[0] : entry[1]).includes(normalize(term))),
    );
    items.push({ ...channel, logo: featuredLogos[channel.id] ?? (row?.[2]?.startsWith("https://") ? row[2] : ""), available: !!row });
  }
  return items;
});

export const getFeaturedChannel = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().max(80) }).parse(data))
  .handler(async ({ data }) => {
    const channel = featuredChannels.find((entry) => entry.id === data.id);
    if (!channel) return null;
    const { loadKind } = await import("./iptv/library.server");
    const rows = await loadKind(channel.kind);
    const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const aliases: Record<string, string[]> = { "abu-dhabi-sports": ["abudhabi", "أبوظبي", "ابوظبي"], alkass: ["alkass", "الكاس", "الكأس"], shahid: ["shahid", "شاهد"] };
    const terms = aliases[channel.id] ?? [channel.query];
    const row = rows.find((entry) => terms.some((term) => normalize(channel.kind === "live" ? entry[0] : entry[1]).includes(normalize(term))));
    return { ...channel, logo: featuredLogos[channel.id] ?? (row?.[2]?.startsWith("https://") ? row[2] : ""), group: row?.[1] ?? "", available: !!row };
  });