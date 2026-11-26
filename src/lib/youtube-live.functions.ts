import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { channels } from "@/lib/channels";

const ALLOWED_YOUTUBE_CHANNELS = new Map<string, string>(
  channels
    .map((c) => c.youtubeChannelId)
    .filter((id): id is string => typeof id === "string" && /^UC[\w-]{22}$/.test(id))
    .map((id) => [id, id]),
);

/**
 * Resolve the video ID of a YouTube channel's current live broadcast, so the
 * player can follow a channel when it ends one stream and starts another.
 * Returns null when the channel is not live or does not allow embedding.
 */
export const resolveYoutubeLive = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ channelId: z.string().regex(/^UC[\w-]{22}$/) }).parse(data))
  .handler(async ({ data }) => {
    const allowedChannelId = ALLOWED_YOUTUBE_CHANNELS.get(data.channelId);
    if (!allowedChannelId) return { videoId: null as string | null };
    try {
      const res = await fetch(`https://www.youtube.com/channel/${allowedChannelId}/live`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept-Language": "en",
          Cookie: "SOCS=CAI; CONSENT=YES+",
        },
      });
      if (!res.ok) return { videoId: null as string | null };
      const html = await res.text();
      const match = html.match(
        /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/,
      );
      const embeddable = html.includes('"playableInEmbed":true');
      return { videoId: match && embeddable ? match[1] : null };
    } catch {
      return { videoId: null as string | null };
    }
  });
