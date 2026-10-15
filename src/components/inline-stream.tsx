import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import Hls from "hls.js";

// Live Xtream streams are requested as HLS; everything goes through the HTTPS relay.
function relayed(raw: string) {
  let u = raw;
  if (/\/live\//.test(u) && /\.ts(?:\?|$)/i.test(u)) u = u.replace(/\.ts(\?|$)/i, ".m3u8$1");
  return `/api/public/iptv?u=${encodeURIComponent(u)}`;
}

export function InlineStream({ url: rawUrl }: { url: string }) {
  const url = rawUrl.startsWith("https://") && !rawUrl.includes("/live/") ? rawUrl : relayed(rawUrl);
  const isHlsUrl = /\.m3u8(?:\?|$|%3F)/i.test(decodeURIComponent(url));
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setError(false);
    setPaused(false);
    let hls: Hls | undefined;
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    if (isHlsUrl && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError(true);
      });
      void video.play().catch(() => undefined);
    } else video.src = url;
    return () => {
      hls?.destroy();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);
  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.paused && v.muted === false) void v.play().catch(() => undefined);
  };
  const goFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };
  const btn =
    "grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground transition-colors hover:text-sky";
  return (
    <div>
      <div ref={wrapRef} className="relative overflow-hidden bg-surface-deep">
        <video
          ref={ref}
          autoPlay
          muted={muted}
          playsInline
          onClick={togglePlay}
          className="aspect-video w-full bg-surface-deep"
        />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={paused ? "تشغيل" : "إيقاف مؤقت"}
          className="absolute inset-0 grid place-items-center"
        >
          <span
            className={`grid h-14 w-14 place-items-center rounded-full bg-background/60 text-foreground backdrop-blur transition-opacity duration-200 ${paused ? "opacity-100" : "opacity-0"}`}
          >
            {paused ? <Play className="h-6 w-6 fill-current" /> : <Pause className="h-6 w-6" />}
          </span>
        </button>
        <div className="absolute bottom-2 left-2 flex gap-2">
          <button type="button" onClick={toggleMute} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} className={btn}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={goFullscreen} aria-label="ملء الشاشة" className={btn}>
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-muted-foreground">تعذّر تشغيل هذا المصدر الآن؛ أعد المحاولة بعد قليل.</p>}
    </div>
  );
}
