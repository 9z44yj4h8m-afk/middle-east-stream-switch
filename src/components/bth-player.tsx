import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize, PictureInPicture2, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import {
  supportsFloatingVideo,
  toggleFloatingVideo,
  type BthStream,
  type FloatingVideoEl,
} from "@/lib/bth-stream";

export type BthPlaybackState = "idle" | "loading" | "live" | "error";

type Props = {
  stream: BthStream | null;
  refreshKey: number;
  muted: boolean;
  onToggleMute: () => void;
  onRefresh: () => void;
  onStateChange: (state: BthPlaybackState) => void;
};

export function BthPlayer({ stream, refreshKey, muted, onToggleMute, onRefresh, onStateChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<BthPlaybackState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [pipReady, setPipReady] = useState(false);

  const updateStatus = (next: BthPlaybackState) => {
    setStatus(next);
    onStateChange(next);
  };

  useEffect(() => {
    setNotice("");
    setErrorMsg("");
    if (!stream) {
      setPipReady(false);
      updateStatus("idle");
      return;
    }
    if (stream.kind === "embed") {
      setPipReady(false);
      updateStatus("loading");
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    updateStatus("loading");

    const fail = (message: string) => {
      if (cancelled) return;
      setErrorMsg(message);
      updateStatus("error");
    };
    const onPlaying = () => {
      if (!cancelled) {
        setErrorMsg("");
        updateStatus("live");
      }
    };
    const onMeta = () => {
      if (!cancelled) setPipReady(supportsFloatingVideo(video as FloatingVideoEl, document));
    };
    const onErr = () => fail("تعذر تشغيل رابط البث المباشر. تحقق من توفر البث وأعد المحاولة.");

    video.disableRemotePlayback = true;
    video.muted = muted;
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", onErr);

    const startNative = () => {
      video.src = stream.streamUrl;
      void video.play().catch(() => {});
    };

    void (async () => {
      const isHls = /\.m3u8(\?|$)/i.test(stream.streamUrl);
      const nativeHls = Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
      if (isHls && !nativeHls) {
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;
        if (Hls.isSupported()) {
          const instance = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls = instance;
          instance.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (nativeHls) {
              instance.destroy();
              hls = null;
              startNative();
              return;
            }
            fail("انقطع البث أو الرابط غير متاح حالياً.");
          });
          instance.loadSource(stream.streamUrl);
          instance.attachMedia(video);
          void video.play().catch(() => {});
          return;
        }
      }
      startNative();
    })().catch(() => fail("تعذر تحميل مشغل البث."));

    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onErr);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream, refreshKey]);

  useEffect(() => {
    if (stream?.kind === "video" && videoRef.current) {
      videoRef.current.muted = muted;
      if (!muted) void videoRef.current.play().catch(() => setNotice("اضغط داخل المشغل لتفعيل الصوت."));
    } else if (stream?.kind === "embed" && stream.canJsMute && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }),
        "https://www.youtube.com",
      );
    }
  }, [muted, stream]);

  const handleFullscreen = () => {
    setNotice("");
    const vid = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (stream?.kind === "video" && vid && typeof vid.webkitEnterFullscreen === "function" && !containerRef.current?.requestFullscreen) {
      vid.webkitEnterFullscreen();
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (!containerRef.current?.requestFullscreen) {
      setNotice("ملء الشاشة غير متاح على هذا المتصفح؛ استخدم زر ملء الشاشة داخل المشغل.");
      return;
    }
    void containerRef.current.requestFullscreen().catch(() => {
      setNotice("تعذر تفعيل ملء الشاشة من الخارج؛ استخدم زر المشغل.");
    });
  };

  const handlePiP = () => {
    setNotice("");
    if (stream?.kind !== "video" || !videoRef.current || !pipReady) {
      setNotice("النافذة الصغيرة تعمل مع روابط البث المباشر (HLS/MP4) في المتصفحات الداعمة.");
      return;
    }
    void toggleFloatingVideo(videoRef.current as FloatingVideoEl, document).catch(() => {
      setNotice("تعذر فتح النافذة الصغيرة حالياً.");
    });
  };

  const signalLabel =
    status === "live"
      ? stream?.kind === "embed" ? "تم تحميل المشغل" : "الإشارة متصلة"
      : status === "loading" ? "جارٍ تحميل البث" : status === "error" ? "انقطاع الإشارة" : "بانتظار الإشارة";

  return (
    <section className="bth-player-card" aria-label="مشغل البث المباشر">
      <div ref={containerRef} className="bth-stage">
        {!stream && (
          <div className="bth-idle-stage">
            <div className="bth-stage-meta" aria-hidden="true" dir="ltr">
              <span>ALMOGHANI / STUDIO</span>
              <span>16:9&nbsp;&nbsp;•&nbsp;&nbsp;OUTPUT</span>
            </div>
            <div className="bth-stage-corners" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="bth-rings" aria-hidden="true">
              <span className="bth-ring bth-ring-1" />
              <span className="bth-ring bth-ring-2" />
              <span className="bth-ring bth-ring-3" />
            </div>
            <div className="bth-idle-emblem" aria-hidden="true">
              <Radio className="h-7 w-7" />
            </div>
            <span className="bth-idle-kicker" dir="ltr">STANDBY</span>
            <p className="bth-idle-title">بانتظار مصدر البث</p>
            <p className="bth-idle-sub">اختر المنصة والصق الرابط بالأسفل، ثم ابدأ العرض على شاشتك</p>
            <div className="bth-waveform" aria-hidden="true">
              {Array.from({ length: 11 }, (_, index) => <span key={index} />)}
            </div>
          </div>
        )}

        {stream?.kind === "embed" && (
          <iframe
            ref={iframeRef}
            key={`${stream.embedUrl}-${refreshKey}`}
            src={stream.embedUrl}
            title={`بث ${stream.label}`}
            className="bth-media"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => updateStatus("live")}
            onError={() => {
              setErrorMsg("تعذر تحميل مشغل المنصة. تأكد من أن البث عام ومتاح للتضمين.");
              updateStatus("error");
            }}
          />
        )}

        {stream?.kind === "video" && (
          <video
            ref={videoRef}
            controls
            muted={muted}
            autoPlay
            playsInline
            className="bth-media"
            aria-label={`بث ${stream.label}`}
          />
        )}

        {status === "error" && errorMsg && (
          <div className="bth-error-overlay" role="alert">
            <AlertTriangle className="h-8 w-8 text-[var(--bth-gold)]" />
            <p className="bth-error-title">تعذر تشغيل البث</p>
            <p className="bth-error-desc">{errorMsg}</p>
            <button type="button" onClick={onRefresh} className="bth-gold-btn">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      <div className="bth-player-bar">
        <div className="bth-signal-indicator" data-state={status}>
          <span className="bth-signal-dot" aria-hidden="true" />
          <span>{signalLabel}</span>
          {stream && <span className="bth-provider-tag">{stream.label}</span>}
        </div>

        <div className="bth-player-tools">
          <button
            type="button"
            className="bth-tool-btn"
            disabled={!stream}
            onClick={onToggleMute}
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="bth-tool-btn"
            disabled={!pipReady}
            onClick={handlePiP}
            aria-label="نافذة فيديو صغيرة"
            title="نافذة فيديو صغيرة"
          >
            <PictureInPicture2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="bth-tool-btn"
            disabled={!stream}
            onClick={handleFullscreen}
            aria-label="ملء الشاشة"
            title="ملء الشاشة"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="bth-player-notice">
          {notice}
        </p>
      )}
    </section>
  );
}