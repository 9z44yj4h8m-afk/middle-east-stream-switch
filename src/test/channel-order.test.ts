import { describe, expect, it } from "vitest";
import { channelGroup, dedupeChannels, orderChannels } from "@/lib/channel-order";
import { channels } from "@/lib/channels";

const ordered = orderChannels(dedupeChannels(channels));
const ids = ordered.map((c) => c.id);

describe("channel ordering", () => {
  it("puts MBC first, then Rotana, then the rest of the Saudi channels", () => {
    expect(ids[0]).toBe("mbc-1");
    expect(ids.indexOf("mbc-1")).toBeLessThan(ids.indexOf("ar-rotana-cinema"));
    expect(ids.indexOf("ar-rotana-cinema")).toBeLessThan(ids.indexOf("saudi-tv"));
  });
  it("orders Saudi before Gulf, Gulf before Arabic and Arabic before foreign", () => {
    const last = (group: string) => Math.max(...ordered.filter((c) => channelGroup(c) === group).map((c) => ids.indexOf(c.id)));
    const first = (group: string) => Math.min(...ordered.filter((c) => channelGroup(c) === group).map((c) => ids.indexOf(c.id)));
    expect(last("saudi")).toBeLessThan(first("gulf"));
    expect(last("gulf")).toBeLessThan(first("arabic"));
    expect(last("arabic")).toBeLessThan(first("foreign"));
  });
  it("lists every channel once and keeps the order inside a group", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(channels.length);
    const gulf = ordered.filter((c) => channelGroup(c) === "gulf").map((c) => c.id);
    expect(ids.filter((id) => gulf.includes(id))).toEqual(gulf);
  });
  it("classifies channels the owner imports later", () => {
    expect(channelGroup({ id: "new-1", name: "MBC 2" })).toBe("saudi");
    expect(channelGroup({ id: "new-2", name: "روتانا فور كات" })).toBe("saudi");
    expect(channelGroup({ id: "new-3", name: "قناة الكويت" })).toBe("gulf");
    expect(channelGroup({ id: "new-4", name: "قناة النيل" })).toBe("arabic");
    expect(channelGroup({ id: "new-5", name: "HBO" })).toBe("foreign");
  });
});
