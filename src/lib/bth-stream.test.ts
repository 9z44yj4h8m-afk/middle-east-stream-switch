import { describe, expect, it } from "vitest";
import { parseBthStream } from "./bth-stream";

describe("parseBthStream", () => {
  it("parses YouTube watch, short, and live links using youtube.com/embed", () => {
    const res = parseBthStream("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "almoghani.net", true);
    expect(res.ok).toBe(true);
    if (res.ok && res.stream.kind === "embed") {
      expect(res.stream.provider).toBe("youtube");
      expect(res.stream.embedUrl).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(res.stream.embedUrl).toContain("mute=1");
      expect(res.stream.embedUrl).not.toContain("nocookie");
    }

    const liveRes = parseBthStream("https://youtube.com/live/dQw4w9WgXcQ", "almoghani.net", false);
    expect(liveRes.ok).toBe(true);
    if (liveRes.ok && liveRes.stream.kind === "embed") {
      expect(liveRes.stream.embedUrl).toContain("mute=0");
    }
  });

  it("parses Kick, Twitch, and X status links", () => {
    const kick = parseBthStream("https://kick.com/almoghani", "almoghani.net", true);
    expect(kick.ok).toBe(true);
    if (kick.ok && kick.stream.kind === "embed") {
      expect(kick.stream.embedUrl).toBe("https://player.kick.com/almoghani?autoplay=true&muted=true");
    }

    const twitch = parseBthStream("https://www.twitch.tv/almoghani", "almoghani.net", false);
    expect(twitch.ok).toBe(true);
    if (twitch.ok && twitch.stream.kind === "embed") {
      expect(twitch.stream.embedUrl).toBe("https://player.twitch.tv/?channel=almoghani&parent=almoghani.net&muted=false");
    }

    const tweet = parseBthStream("https://x.com/Op430/status/1234567890123456789", "almoghani.net");
    expect(tweet.ok).toBe(true);
    if (tweet.ok && tweet.stream.kind === "embed") {
      expect(tweet.stream.provider).toBe("x");
      expect(tweet.stream.embedUrl).toContain("1234567890123456789");
    }
  });

  it("supports secure direct HLS streams and rejects unsafe or invalid links", () => {
    const hls = parseBthStream("https://example.com/live/stream.m3u8", "almoghani.net");
    expect(hls.ok).toBe(true);
    if (hls.ok && hls.stream.kind === "video") {
      expect(hls.stream.provider).toBe("direct");
      expect(hls.stream.streamUrl).toBe("https://example.com/live/stream.m3u8");
    }

    expect(parseBthStream("", "almoghani.net").ok).toBe(false);
    expect(parseBthStream("rtmp://live.example.com/app", "almoghani.net").ok).toBe(false);
    expect(parseBthStream("http://insecure.example.com/live.m3u8", "almoghani.net").ok).toBe(false);
    expect(parseBthStream("not-a-url", "almoghani.net").ok).toBe(false);
    expect(parseBthStream("https://example.com/page", "almoghani.net").ok).toBe(false);
  });
});