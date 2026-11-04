import { describe, expect, it } from "vitest";
import { readChannelPlaylist, publicChannelUrl, officialYoutubeId } from "@/lib/channel-playlist";

describe("owner channel playlist", () => {
  it("does not mistake HLS live paths for YouTube videos", () => {
    expect(officialYoutubeId("https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1/hash/index.m3u8")).toBeNull();
    expect(officialYoutubeId("https://www.youtube.com/watch?v=bNyUyrR0PHo")).toBe("bNyUyrR0PHo");
  });
  it("preserves supplied channels and puts sports in the sports section", () => {
    const result = readChannelPlaylist('#EXTM3U\n#EXTINF:-1 tvg-logo="https://example.com/logo.png" group-title="Sports",SSC\nhttps://example.com/channel.m3u8');
    expect(result.channels).toEqual([{ name: "SSC", url: "https://example.com/channel.m3u8", logo: "https://example.com/logo.png", category: "رياضية" }]);
  });
  it("does not duplicate stream URLs on import", () => {
    const result = readChannelPlaylist('#EXTM3U\n#EXTINF:-1,One\nhttps://example.com/live.m3u8\n#EXTINF:-1,Two\nhttps://example.com/live.m3u8');
    expect(result.channels).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });
  it("never exposes private IPTV credentials in the public catalog", () => {
    expect(publicChannelUrl("https://example.com/live/member/password/1.m3u8")).toBe(false);
    expect(publicChannelUrl("https://example.com/stream?username=member&password=secret")).toBe(false);
    expect(publicChannelUrl("https://member:password@example.com/channel.m3u8")).toBe(false);
    expect(publicChannelUrl("https://example.com/channel.m3u8")).toBe(true);
  });
  it("rejects non-playlist files", () => {
    expect(() => readChannelPlaylist("<html>not a playlist</html>")).toThrow();
  });
});