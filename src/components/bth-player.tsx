import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { AlertTriangle, Eye, Maximize, Maximize2, Minimize2, PictureInPicture2, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import {
  formatBthViewerCount,
  supportsFloatingVideo,
  toggleFloatingVideo,
  type BthStream,
  type FloatingVideoEl,
} from "@/lib/bth-stream";

export type BthPlaybackState = "idle" | "preview" | "loading" | "live" | "error";

export type BthPlayerHandle = {
  toggleMinimize: () => void;
};

type Props = {
  ref?: Ref<BthPlayerHandle>;
  stream: BthStream | null;
  mediaStream: MediaStream | null;
  mediaLabel?: string;
  isLocalPreview?: boolean;
  isAudienceLive?: boolean;
  viewerCount?: number;
  minimized: boolean;
  onMinimizedChange: (next: boolean) => void;
  refreshKey: number;
  muted: boolean;
  onToggleMute: () => void;
  onRefresh: () => void;
  onStateChange: (state: BthPlaybackState) => void;
};

export function BthPlayer({
  ref,
  stream,
  mediaStream,
  mediaLabel,
  isLocalPreview = false,
  isAudienceLive = false,
  viewerCount = 0,
  minimized,
  onMinimizedChange,
  refreshKey,
  muted,
  onToggleMute,
  onRefresh,
  onStateChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<BthPlaybackState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [pipReady, setPipReady] = useState(false);

  const hasActiveMedia = Boolean(mediaStream || stream);
  const activeTag = mediaStream ? mediaLabel || "البث المباشر" : stream?.label;

  const updateStatus = (next: BthPlaybackState) => {
    setStatus(next);
    onStateChange(next);
  };

  useEffect(() => {
    setNotice("");
    setErrorMsg("");

    if (mediaStream) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.muted = isLocalPreview ? true : muted;
        const onMeta = () => setPipReady(supportsFloatingVideo(video as FloatingVideoEl, document));
        video.addEventListener("loadedmetadata", onMeta);
        void video.play().catch(() => {});
        onMeta();
        updateStatus(isAudienceLive || !isLocalPreview ? "live" : "preview");
        return () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.srcObject = null;
        };
      }
      updateStatus(isAudienceLive || !isLocalPreview ? "live" : "preview");
      return;
    }

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
  }, [mediaStream, isLocalPreview, isAudienceLive, stream, refreshKey]);

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.muted = isLocalPreview ? true : muted;
      if (!isLocalPreview && !muted) void videoRef.current.play().catch(() => setNotice("اضغط داخل المشغل لتفعيل الصوت."));
    } else if (stream?.kind === "video" && videoRef.current) {
      videoRef.current.muted = muted;
      if (!muted) void videoRef.current.play().catch(() => setNotice("اضغط داخل المشغل لتفعيل الصوت."));
    } else if (stream?.kind === "embed" && stream.canJsMute && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: muted ? "mute" : "unMute", args: [] }),
        "https://www.youtube.com",
      );
    }
  }, [muted, stream, mediaStream, isLocalPreview]);

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
    const canNativePip = Boolean((mediaStream || stream?.kind === "video") && videoRef.current && pipReady);
    if (canNativePip && videoRef.current) {
      void toggleFloatingVideo(videoRef.current as FloatingVideoEl, document).catch(() => {
        onMinimizedChange(!minimized);
      });
      return;
    }
    onMinimizedChange(!minimized);
  };

  useImperativeHandle(ref, () => ({ toggleMinimize: handlePiP }), [mediaStream, stream, pipReady, minimized]);

  const signalLabel =
    status === "live"
      ? isAudienceLive
        ? "مباشر للجمهور"
        : "إشارة متصلة"
      : status === "preview"
        ? "معاينة خاصة — لم يبدأ للجمهور"
        : status === "loading"
          ? "جارٍ تحميل البث"
          : status === "error"
            ? "انقطاع الإشارة"
            : "بانتظار الإشارة";

  return (
    <section className="bth-player-card" data-minimized={minimized ? "true" : "false"} aria-label="مشغل البث المباشر">
      <div ref={containerRef} className="bth-stage">
        {!hasActiveMedia && (
          <div className="bth-idle-stage">
            <div className="bth-rings" aria-hidden="true">
              <span className="bth-ring bth-ring-1" />
              <span className="bth-ring bth-ring-2" />
              <span className="bth-ring bth-ring-3" />
            </div>
            <div className="bth-idle-emblem" aria-hidden="true">
              <Radio className="h-7 w-7" />
            </div>
            <p className="bth-idle-title">لا يوجد بث نشط حالياً</p>
            <p className="bth-idle-sub">اضغط «بداية البث» لمعاينة الشاشة أو الكاميرا، أو الصق رابط بثك بالأسفل</p>
          </div>
        )}

        {!mediaStream && stream?.kind === "embed" && (
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

        {(mediaStream || stream?.kind === "video") && (
          <video
            ref={videoRef}
            controls={!isLocalPreview}
            muted={isLocalPreview ? true : muted}
            autoPlay
            playsInline
            className="bth-media"
            aria-label={activeTag ? `بث ${activeTag}` : "معاينة البث المباشر"}
          />
        )}

        {hasActiveMedia && (isLocalPreview || isAudienceLive) && (
          <div className="bth-stage-meta">
            <span className="bth-stage-badge" data-live={isAudienceLive ? "true" : "false"}>
              {isAudienceLive ? "مباشر للجمهور" : "معاينة الشاشة — خاص بك"}
            </span>
            {isAudienceLive && (
              <span className="bth-stage-viewers" aria-label={`عدد المشاهدين ${viewerCount}`}>
                <Eye className="h-3.5 w-3.5" />
                <span>{formatBthViewerCount(viewerCount)}</span>
              </span>
            )}
          </div>
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
          {activeTag && <span className="bth-provider-tag">{activeTag}</span>}
        </div>

        <div className="bth-player-tools">
          <button
            type="button"
            className="bth-tool-btn"
            disabled={!hasActiveMedia || isLocalPreview}
            onClick={onToggleMute}
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="bth-tool-btn"
            onClick={handlePiP}
            aria-label={minimized ? "تكبير الشاشة" : "تصغير الشاشة"}
            title={minimized ? "تكبير الشاشة" : "تصغير الشاشة"}
          >
            {minimized ? <Maximize2 className="h-4 w-4" /> : pipReady ? <PictureInPicture2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="bth-tool-btn"
            disabled={!hasActiveMedia}
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