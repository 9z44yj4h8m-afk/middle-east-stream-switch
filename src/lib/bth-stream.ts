export type BthProviderId = "youtube" | "kick" | "twitch" | "x" | "direct";

export type BthStream =
  | { kind: "embed"; provider: Exclude<BthProviderId, "direct">; label: string; embedUrl: string; sourceUrl: string; canJsMute: boolean }
  | { kind: "video"; provider: "direct"; label: string; streamUrl: string; sourceUrl: string };

export type BthParseResult =
  | { ok: true; stream: BthStream }
  | { ok: false; error: string };

export type BthProviderChip = {
  id: Exclude<BthProviderId, "direct">;
  name: string;
  placeholder: string;
  hint: string;
};

export const BTH_PROVIDERS: readonly BthProviderChip[] = [
  { id: "youtube", name: "YouTube", placeholder: "https://www.youtube.com/watch?v=...", hint: "رابط فيديو أو بث مباشر من يوتيوب" },
  { id: "kick", name: "Kick", placeholder: "https://kick.com/channel", hint: "رابط قناة بث مباشر على Kick" },
  { id: "twitch", name: "Twitch", placeholder: "https://www.twitch.tv/channel", hint: "رابط قناة بث مباشر على Twitch" },
  { id: "x", name: "X (تويتر)", placeholder: "https://x.com/username/status/...", hint: "رابط منشور فيديو أو بث من تويتر (X)" },
] as const;

export function extractYoutubeId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const valid = (id: string | null) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);
    if (host === "youtu.be" || host === "www.youtu.be") {
      return valid(url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null);
    }
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) return null;
    if (url.pathname === "/watch") return valid(url.searchParams.get("v"));
    return valid(url.pathname.match(/^\/(?:live|embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? null);
  } catch {
    return null;
  }
}

export function extractTweetId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com", "mobile.x.com"].includes(host)) return null;
    return url.pathname.match(/^\/[A-Za-z0-9_]{1,15}\/status\/(\d{5,25})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseBthStream(rawInput: string, parentHost: string, muted = true): BthParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, error: "أدخل رابط البث أولاً ثم اضغط تشغيل." };
  }
  if (/^(rtmp|rtsp|udp|javascript|data|file):/i.test(trimmed)) {
    return { ok: false, error: "صيغة الرابط غير مدعومة في المتصفح. استخدم رابط YouTube أو Kick أو Twitch أو X أو رابط HLS آمن (https)." };
  }

  const yt = extractYoutubeId(trimmed);
  if (yt) {
    const m = muted ? "1" : "0";
    return {
      ok: true,
      stream: {
        kind: "embed",
        provider: "youtube",
        label: "YouTube",
        embedUrl: `https://www.youtube.com/embed/${yt}?autoplay=1&mute=${m}&playsinline=1&rel=0&enablejsapi=1`,
        sourceUrl: trimmed,
        canJsMute: true,
      },
    };
  }

  const tweet = extractTweetId(trimmed);
  if (tweet) {
    return {
      ok: true,
      stream: {
        kind: "embed",
        provider: "x",
        label: "تويتر (X)",
        embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweet}&theme=dark&lang=ar`,
        sourceUrl: trimmed,
        canJsMute: false,
      },
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "الرابط غير صالح. تأكد من نسخه كاملاً بدءاً بـ https://" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "يدعم المشغل روابط http و https فقط." };
  }

  const host = url.hostname.toLowerCase();
  const channelMatch = url.pathname.match(/^\/([A-Za-z0-9_-]{2,30})\/?$/)?.[1];

  if (["kick.com", "www.kick.com"].includes(host) && channelMatch) {
    return {
      ok: true,
      stream: {
        kind: "embed",
        provider: "kick",
        label: "Kick",
        embedUrl: `https://player.kick.com/${encodeURIComponent(channelMatch)}?autoplay=true&muted=${muted ? "true" : "false"}`,
        sourceUrl: trimmed,
        canJsMute: false,
      },
    };
  }

  if (["twitch.tv", "www.twitch.tv", "m.twitch.tv"].includes(host) && channelMatch) {
    const safeParent = parentHost || "almoghani.net";
    return {
      ok: true,
      stream: {
        kind: "embed",
        provider: "twitch",
        label: "Twitch",
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(channelMatch)}&parent=${encodeURIComponent(safeParent)}&muted=${muted ? "true" : "false"}`,
        sourceUrl: trimmed,
        canJsMute: false,
      },
    };
  }

  if (/\.(m3u8|mp4|webm|m4v)(\?|$)/i.test(url.pathname + url.search)) {
    if (url.protocol === "http:") {
      return { ok: false, error: "روابط البث المباشر غير المشفّرة (http) محظورة في المتصفح الآمن. استخدم رابط https." };
    }
    return {
      ok: true,
      stream: {
        kind: "video",
        provider: "direct",
        label: /\.m3u8/i.test(url.pathname + url.search) ? "HLS مباشر" : "فيديو مباشر",
        streamUrl: url.href,
        sourceUrl: trimmed,
      },
    };
  }

  return { ok: false, error: "الرابط غير مدعوم. أدخل رابط بث من YouTube أو Kick أو Twitch أو منشور فيديو من تويتر (X) أو رابط m3u8 آمن." };
}

export type FloatingVideoEl = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
};

export function supportsFloatingVideo(video: FloatingVideoEl | null, doc: Document): boolean {
  if (!video) return false;
  return Boolean(
    (doc.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") ||
      (typeof video.webkitSetPresentationMode === "function" && video.webkitSupportsPresentationMode?.("picture-in-picture")),
  );
}

export async function toggleFloatingVideo(video: FloatingVideoEl, doc: Document): Promise<void> {
  if (doc.pictureInPictureElement === video) {
    await doc.exitPictureInPicture();
    return;
  }
  if (doc.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") {
    await video.requestPictureInPicture();
    return;
  }
  if (typeof video.webkitSetPresentationMode === "function" && video.webkitSupportsPresentationMode?.("picture-in-picture")) {
    video.webkitSetPresentationMode(video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
    return;
  }
  throw new Error("النافذة الصغيرة غير متاحة في هذا المتصفح.");
}