import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Check,
  Copy,
  Eye,
  Link2,
  Lock,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorPlay,
  MonitorUp,
  Play,
  Radio,
  RefreshCw,
  Share2,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import { BthPlayer, type BthPlaybackState, type BthPlayerHandle } from "@/components/bth-player";
import {
  BTH_PROVIDERS,
  formatBthViewerCount,
  getBthShareUrl,
  normalizeBthPublicBroadcast,
  parseBthStream,
  type BthProviderChip,
} from "@/lib/bth-stream";
import { checkBthOwner, saveBthPublicBroadcast } from "@/lib/bth-broadcast.functions";
import {
  getBthLiveViewerCount,
  getBthSession,
  setBthAudienceLive,
  setBthCaptureSource,
  setBthLocalMedia,
  setBthMicEnabled,
  setBthMinimized,
  setBthPageMounted,
  setBthPublicState,
  setBthStream,
  startBthSessionBroadcaster,
  stopBthSessionBroadcaster,
  stopBthSessionLocalMedia,
  useBthSession,
} from "@/lib/bth-session";
import { BTH_NOTIFY_CHANNEL, notifyBthPublicRefresh, startBthViewer } from "@/lib/bth-webrtc";
import { loginOwner } from "@/lib/admin-login.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bth")({
  head: () => ({
    meta: [
      { title: "بث المغني الشخصي — ALMOGHANI LIVE" },
      { name: "description", content: "شاشة بث المغني المباشر والشخصي داخل موقع المغني." },
      { property: "og:title", content: "بث المغني الشخصي — ALMOGHANI LIVE" },
      { property: "og:description", content: "شاشة بث المغني المباشر والشخصي داخل موقع المغني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://almoghani.net/bth" }],
  }),
  component: BroadcastPage,
});

const STATUS_COPY: Record<BthPlaybackState, { ar: string; code: string }> = {
  idle: { ar: "جاهز", code: "IDLE" },
  preview: { ar: "معاينة", code: "PRE" },
  loading: { ar: "اتصال", code: "SYNC" },
  live: { ar: "مباشر", code: "LIVE" },
  error: { ar: "متوقف", code: "ERR" },
};

function BroadcastPage() {
  const playerRef = useRef<BthPlayerHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<{ stop: () => void } | null>(null);

  const checkOwnerFn = useServerFn(checkBthOwner);
  const saveBroadcastFn = useServerFn(saveBthPublicBroadcast);
  const ownerLoginFn = useServerFn(loginOwner);
  const session = useBthSession();
  const { stream, localMedia, captureSource, micEnabled, audienceLive, publicState, minimized } = session;
  const viewerCount = getBthLiveViewerCount(session);

  const [input, setInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<BthProviderChip["id"]>("youtube");
  const [remoteMedia, setRemoteMedia] = useState<MediaStream | null>(null);
  const [playbackState, setPlaybackState] = useState<BthPlaybackState>("idle");
  const [muted, setMuted] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyAction, setBusyAction] = useState<"capture" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [studioError, setStudioError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [pendingPublish, setPendingPublish] = useState(false);
  const [shareUrl, setShareUrl] = useState("https://almoghani.net/bth");
  const [copiedLink, setCopiedLink] = useState(false);

  const activeChip = BTH_PROVIDERS.find((p) => p.id === selectedProvider) ?? BTH_PROVIDERS[0];
  const statusChip = STATUS_COPY[playbackState];

  const stopViewer = useCallback(() => {
    viewerRef.current?.stop();
    viewerRef.current = null;
    setRemoteMedia(null);
  }, []);

  const loadPublicBroadcast = useCallback(async () => {
    const current = getBthSession();
    if (current.audienceLive || current.localMedia) return;
    const { data } = await supabase.from("site_settings").select("value").eq("key", "bth_public_stream").maybeSingle();
    const normalized = normalizeBthPublicBroadcast(data?.value);
    setBthPublicState(normalized);
    stopViewer();
    if (!normalized || !normalized.active) return;
    if (normalized.mode === "link") {
      const host = typeof window === "undefined" ? "almoghani.net" : window.location.hostname;
      const parsed = parseBthStream(normalized.sourceUrl, host, true);
      if (parsed.ok) {
        setBthStream(parsed.stream);
        setRefreshKey((k) => k + 1);
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const check = await checkOwnerFn();
          if (check.isAdmin) setBthAudienceLive(true);
        }
      } catch {
        /* visitor stays in viewer mode */
      }
      return;
    }
    setBthStream(null);
    setPlaybackState("loading");
    viewerRef.current = startBthViewer(normalized.sessionId, {
      onStream: (media) => {
        setError("");
        setRemoteMedia(media);
      },
      onEnded: () => {
        setRemoteMedia(null);
        setBthPublicState({ active: false, updatedAt: new Date().toISOString() });
        setPlaybackState("idle");
        setStatusNotice("انتهى البث المباشر من المذيع.");
      },
      onError: (msg) => {
        setRemoteMedia(null);
        setError(msg);
        setPlaybackState("error");
      },
    });
  }, [checkOwnerFn, stopViewer]);

  useEffect(() => {
    setShareUrl(getBthShareUrl(window.location.origin, window.location.hostname));
    setBthPageMounted(true);
    void loadPublicBroadcast();
    const ch = supabase
      .channel(BTH_NOTIFY_CHANNEL, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "public-refresh" }, () => {
        void loadPublicBroadcast();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
      stopViewer();
      setBthPageMounted(false);
    };
  }, [loadPublicBroadcast, stopViewer]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const handleCopyShareLink = async () => {
    await copyText(shareUrl);
    setCopiedLink(true);
    setStatusNotice("تم نسخ رابط البث — أرسله لأصدقائك للمشاهدة مباشرة.");
    window.setTimeout(() => setCopiedLink(false), 2400);
  };

  const handleShareLink = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "بث المغني المباشر — ALMOGHANI LIVE",
          text: "شاهد البث المباشر الآن على المغني لايف",
          url: shareUrl,
        });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    await handleCopyShareLink();
  };

  const startStream = (rawUrl: string, nextMuted: boolean) => {
    stopViewer();
    stopBthSessionLocalMedia();
    setBthAudienceLive(false);
    setStatusNotice("");
    const host = typeof window === "undefined" ? "almoghani.net" : window.location.hostname;
    const parsed = parseBthStream(rawUrl, host, nextMuted);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError("");
    setBthStream(parsed.stream);
    if (parsed.stream.provider !== "direct") setSelectedProvider(parsed.stream.provider);
    setRefreshKey((k) => k + 1);
  };

  const handleStartPreview = async () => {
    setError("");
    setStudioError("");
    setStatusNotice("");
    setBusyAction("capture");
    stopViewer();
    stopBthSessionLocalMedia();
    setBthStream(null);
    setBthAudienceLive(false);
    try {
      let media: MediaStream;
      if (captureSource === "screen") {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          setStudioError("مشاركة الشاشة غير متاحة على متصفح الآيفون؛ اختر «الكاميرا» أو الصق رابط بث مباشر بالأسفل.");
          return;
        }
        media = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStudioError("الوصول للكاميرا غير متاح في هذا المتصفح.");
          return;
        }
        media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: micEnabled,
        });
      }

      if (captureSource === "screen" && micEnabled && navigator.mediaDevices?.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          micStream.getAudioTracks().forEach((track) => media.addTrack(track));
        } catch {
          setStatusNotice("بدأت معاينة الشاشة بدون مايكروفون بسبب عدم منح الإذن.");
        }
      }

      setBthLocalMedia(media, () => {
        if (getBthSession().audienceLive) void handleStopAudience();
        stopBthSessionLocalMedia();
        setPlaybackState("idle");
      });
      setStatusNotice("المعاينة جاهزة — اضغط «بدء البث للجمهور» عندما تكون مستعداً.");
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setStudioError(
        name === "NotAllowedError"
          ? "لم تسمح بمشاركة الشاشة أو الكاميرا. أعد الضغط على «بداية البث» ومنح الإذن."
          : "تعذر فتح الشاشة أو الكاميرا حالياً. تحقق من الأذونات وحاول مجدداً.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const executePublishToAudience = async () => {
    setError("");
    setStudioError("");
    setStatusNotice("");
    const current = getBthSession();
    const activeMedia = current.localMedia;
    const activeStream = current.stream;
    if (!activeMedia && !activeStream) {
      setStudioError("اضغط «بداية البث» لاختيار الشاشة أو الكاميرا، أو شغّل رابط بث بالأسفل أولاً.");
      return;
    }

    setBusyAction("publish");
    try {
      if (activeMedia) {
        const sessionId = `bth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const res = await saveBroadcastFn({
          data: { action: "start_webrtc", sessionId, source: current.captureSource },
        });
        startBthSessionBroadcaster(activeMedia, sessionId);
        setBthPublicState(res.state);
        setBthAudienceLive(true);
        setStatusNotice("البث مباشر للجمهور الآن — سيبقى شغالاً حتى لو تنقّلت في الموقع، ويمكنك نسخ الرابط وإرساله لأصدقائك.");
      } else if (activeStream) {
        const res = await saveBroadcastFn({
          data: { action: "start_link", sourceUrl: activeStream.sourceUrl },
        });
        setBthPublicState(res.state);
        setBthAudienceLive(true);
        await notifyBthPublicRefresh();
        setStatusNotice("تم نشر البث للجمهور — سيبقى شغالاً حتى لو خرجت من الصفحة أو أغلقت المتصفح.");
      }
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : "تعذر بدء البث للجمهور حالياً.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartAudience = async () => {
    setError("");
    setStudioError("");
    const current = getBthSession();
    if (!current.localMedia && !current.stream) {
      setStudioError("اضغط «بداية البث» لاختيار الشاشة أو الكاميرا، أو شغّل رابط بث بالأسفل أولاً.");
      return;
    }
    setBusyAction("publish");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const check = await checkOwnerFn();
        if (check.isAdmin) {
          await executePublishToAudience();
          return;
        }
      }
      setPendingPublish(true);
      setShowAuthBox(true);
      setAuthError("");
    } catch {
      setPendingPublish(true);
      setShowAuthBox(true);
      setAuthError("");
    } finally {
      setBusyAction(null);
    }
  };

  const handleStopAudience = async () => {
    setBusyAction("publish");
    try {
      stopBthSessionBroadcaster();
      const res = await saveBroadcastFn({ data: { action: "stop" } });
      setBthPublicState(res.state);
      await notifyBthPublicRefresh();
      setStatusNotice("تم إنهاء البث للجمهور.");
    } catch (e) {
      setStudioError(e instanceof Error ? e.message : "تعذر إنهاء البث.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleOwnerLogin = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!ownerPassword.trim()) {
      setAuthError("أدخل كلمة مرور المالك.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const res = await ownerLoginFn({ data: { password: ownerPassword.trim() } });
      if (!res.ok) {
        setAuthError("كلمة المرور غير صحيحة.");
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (setErr) {
        setAuthError("تعذر تفعيل الجلسة؛ حاول مرة أخرى.");
        return;
      }
      setOwnerPassword("");
      setShowAuthBox(false);
      if (pendingPublish) {
        setPendingPublish(false);
        await executePublishToAudience();
      }
    } catch {
      setAuthError("تعذر التحقق حالياً؛ حاول مرة أخرى.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMuted(true);
    startStream(input, true);
  };

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (stream && stream.kind === "embed" && !stream.canJsMute) {
      startStream(stream.sourceUrl, nextMuted);
    }
  };

  const handleRefresh = () => {
    if (localMedia) {
      void handleStartPreview();
      return;
    }
    if (!stream) {
      if (input.trim()) {
        startStream(input, muted);
      } else {
        void loadPublicBroadcast();
      }
      return;
    }
    setError("");
    setRefreshKey((k) => k + 1);
  };

  const handleClear = () => {
    if (audienceLive) void handleStopAudience();
    stopViewer();
    stopBthSessionLocalMedia();
    setInput("");
    setBthStream(null);
    setError("");
    setStudioError("");
    setStatusNotice("");
    setMuted(true);
    setPlaybackState("idle");
  };

  const activeMediaStream = localMedia ?? remoteMedia;
  const isLocalPreview = Boolean(localMedia);
  const isPublicLive = audienceLive || Boolean(publicState?.active);
  const activeMediaLabel = localMedia
    ? captureSource === "camera"
      ? "الكاميرا"
      : "الشاشة"
    : publicState?.active
      ? publicState.label
      : "بث مباشر";

  const broadcastHeading = audienceLive
    ? "البث مباشر للجمهور الآن"
    : localMedia
      ? captureSource === "camera"
        ? "معاينة الكاميرا — خاص بك"
        : "معاينة الشاشة — خاص بك"
      : remoteMedia && publicState?.active
        ? publicState.label
        : stream
          ? `بث ${stream.label}`
          : "شاشتي — البث الشخصي";

  const broadcastSubtitle = audienceLive
    ? `البث مستمر حتى عند التنقل داخل الموقع · ${formatBthViewerCount(viewerCount)}`
    : localMedia
      ? "معاينة خاصة قبل الظهور للجمهور — اضغط «بدء البث للجمهور» للنشر"
      : stream
        ? playbackState === "error"
          ? "تعذر تشغيل الرابط الحالي؛ أعد المحاولة أو استبدل الرابط"
          : publicState?.active && publicState.mode === "link"
            ? `البث الرئيسي النشط للجمهور · ${formatBthViewerCount(viewerCount)}`
            : "رابط نشط لهذه الجلسة فقط"
        : "اضغط «بداية البث» أو الصق رابط البث بالأسفل للبدء";

  return (
    <div className="bth-studio" dir="rtl">
      <header className="bth-topbar">
        <div className="bth-topbar-inner">
          <div className="bth-brand">
            <div className="bth-brand-mark" aria-hidden="true">
              <span className="bth-brand-wave" />
              <Radio className="h-4 w-4" />
            </div>
            <div className="bth-brand-text">
              <div className="bth-wordmark" dir="ltr">
                <span>ALMOGHANI</span>
                <strong>LIVE</strong>
              </div>
              <span className="bth-brand-sub">البث الشخصي</span>
            </div>
            <span className="bth-status-chip" data-state={playbackState} role="status" aria-live="polite">
              <span className="bth-status-dot" aria-hidden="true" />
              <span>{statusChip.ar}</span>
              <small dir="ltr">{statusChip.code}</small>
            </span>
            <span className="bth-viewer-chip" data-live={isPublicLive ? "true" : "false"} aria-live="polite" title="عدد المشاهدين الآن">
              <Eye className="h-3.5 w-3.5" />
              <span>{formatBthViewerCount(viewerCount)}</span>
            </span>
          </div>

          <nav className="bth-shortcuts" aria-label="اختصارات البث">
            <Link to="/" className="bth-shortcut-btn bth-shortcut-silver">
              <MonitorPlay className="h-3.5 w-3.5" />
              <span>معاينة الموقع</span>
            </Link>
            <Link to="/admin" className="bth-shortcut-btn bth-shortcut-gold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>لوحة التحكم</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="bth-main">
        <BthPlayer
          ref={playerRef}
          stream={stream}
          mediaStream={activeMediaStream}
          mediaLabel={activeMediaLabel}
          isLocalPreview={isLocalPreview}
          isAudienceLive={isPublicLive}
          viewerCount={viewerCount}
          minimized={minimized}
          onMinimizedChange={setBthMinimized}
          refreshKey={refreshKey}
          muted={muted}
          onToggleMute={handleToggleMute}
          onRefresh={handleRefresh}
          onStateChange={setPlaybackState}
        />

        <section className="bth-controls-panel" aria-label="أزرار التحكم بالبث">
          <div className="bth-source-switch" role="group" aria-label="مصدر البث من جهازك">
            <button
              type="button"
              className="bth-provider-chip"
              data-active={captureSource === "screen" ? "true" : "false"}
              aria-pressed={captureSource === "screen"}
              disabled={busyAction !== null || audienceLive}
              onClick={() => setBthCaptureSource("screen")}
            >
              <MonitorUp className="h-3.5 w-3.5" />
              <span>الشاشة</span>
            </button>
            <button
              type="button"
              className="bth-provider-chip"
              data-active={captureSource === "camera" ? "true" : "false"}
              aria-pressed={captureSource === "camera"}
              disabled={busyAction !== null || audienceLive}
              onClick={() => setBthCaptureSource("camera")}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>الكاميرا</span>
            </button>
            <button
              type="button"
              className="bth-provider-chip"
              data-active={micEnabled ? "true" : "false"}
              aria-pressed={micEnabled}
              disabled={busyAction !== null || audienceLive}
              onClick={() => setBthMicEnabled(!micEnabled)}
            >
              {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span>{micEnabled ? "المايك مفعّل" : "المايك مغلق"}</span>
            </button>
          </div>

          <div className="bth-action-grid">
            <button
              type="button"
              className="bth-action-btn bth-action-silver"
              disabled={busyAction !== null || audienceLive}
              onClick={() => void handleStartPreview()}
            >
              <MonitorPlay className="h-4 w-4" />
              <span>{busyAction === "capture" ? "جارٍ التجهيز..." : "بداية البث"}</span>
            </button>

            {audienceLive ? (
              <button
                type="button"
                className="bth-action-btn bth-action-live"
                disabled={busyAction !== null}
                onClick={() => void handleStopAudience()}
              >
                <Square className="h-4 w-4 fill-current" />
                <span>إنهاء بث الجمهور</span>
              </button>
            ) : (
              <button
                type="button"
                className="bth-gold-btn bth-action-btn"
                disabled={busyAction !== null}
                onClick={() => void handleStartAudience()}
              >
                <Radio className="h-4 w-4" />
                <span>{busyAction === "publish" ? "جارٍ البدء..." : "بدء البث للجمهور"}</span>
              </button>
            )}

            <button
              type="button"
              className="bth-action-btn bth-action-silver"
              onClick={() => playerRef.current?.toggleMinimize()}
            >
              {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              <span>{minimized ? "تكبير الشاشة" : "تصغير الشاشة"}</span>
            </button>
          </div>

          <div className="bth-share-bar" aria-label="رابط مشاركة البث للأصدقاء">
            <div className="bth-share-link-box">
              <span className="bth-share-label">رابط البث للأصدقاء</span>
              <input
                type="text"
                readOnly
                dir="ltr"
                value={shareUrl}
                aria-label="رابط البث المباشر"
                onFocus={(e) => e.currentTarget.select()}
                className="bth-share-input"
              />
            </div>
            <div className="bth-share-actions">
              <button
                type="button"
                className="bth-share-btn bth-share-copy"
                data-copied={copiedLink ? "true" : "false"}
                onClick={() => void handleCopyShareLink()}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? "تم النسخ" : "نسخ الرابط"}</span>
              </button>
              <button type="button" className="bth-share-btn" onClick={() => void handleShareLink()}>
                <Share2 className="h-4 w-4" />
                <span>مشاركة</span>
              </button>
            </div>
          </div>

          {statusNotice && (
            <p role="status" className="bth-studio-notice">
              {statusNotice}
            </p>
          )}

          {studioError && (
            <p role="alert" className="bth-form-error">
              {studioError}
            </p>
          )}

          {showAuthBox && (
            <form onSubmit={handleOwnerLogin} className="bth-owner-auth">
              <div className="bth-owner-auth-head">
                <span className="bth-owner-auth-title">
                  <Lock className="h-4 w-4" />
                  <span>تأكيد دخول المالك لبدء البث للجمهور</span>
                </span>
                <button type="button" className="bth-ghost-btn bth-close-mini" onClick={() => setShowAuthBox(false)} aria-label="إغلاق">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bth-input-row">
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => {
                    setOwnerPassword(e.target.value);
                    if (authError) setAuthError("");
                  }}
                  placeholder="كلمة مرور المالك"
                  autoComplete="current-password"
                  className="bth-url-input"
                />
                <button type="submit" disabled={authBusy} className="bth-gold-btn bth-play-submit">
                  <span>{authBusy ? "جارٍ التحقق..." : "تأكيد والبدء"}</span>
                </button>
              </div>
              {authError && (
                <p role="alert" className="bth-form-error">
                  {authError}
                </p>
              )}
            </form>
          )}
        </section>

        <section className="bth-info-bar" aria-label="حالة البث الحالي">
          <div className="bth-info-copy">
            <h1>{broadcastHeading}</h1>
            <p>{broadcastSubtitle}</p>
          </div>
          <div className="bth-info-actions">
            {(stream || localMedia || audienceLive) && (
              <button type="button" className="bth-ghost-btn" onClick={handleClear}>
                <X className="h-4 w-4" />
                <span>إيقاف</span>
              </button>
            )}
            <button
              type="button"
              className="bth-refresh-btn"
              onClick={handleRefresh}
              aria-label="إعادة تشغيل البث"
              title="إعادة تشغيل البث"
            >
              <RefreshCw className="h-4 w-4" />
              <span>تحديث</span>
            </button>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="bth-source-panel" noValidate>
          <div className="bth-source-head">
            <label htmlFor="bth-stream-link" className="bth-source-label">
              <Link2 className="h-4 w-4" />
              <span>رابط مصدر البث</span>
            </label>
            <span className="bth-source-hint">{activeChip?.hint}</span>
          </div>

          <div className="bth-provider-row" role="group" aria-label="المنصات المدعومة">
            {BTH_PROVIDERS.map((chip) => {
              const active = selectedProvider === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className="bth-provider-chip"
                  data-active={active ? "true" : "false"}
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedProvider(chip.id);
                    setError("");
                    inputRef.current?.focus();
                  }}
                >
                  {chip.name}
                </button>
              );
            })}
          </div>

          <div className="bth-input-row">
            <div className="bth-input-wrap">
              <input
                ref={inputRef}
                id="bth-stream-link"
                type="url"
                dir="ltr"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder={activeChip?.placeholder ?? "https://kick.com/..."}
                value={input}
                aria-invalid={Boolean(error)}
                aria-describedby="bth-stream-help"
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError("");
                }}
                className="bth-url-input"
              />
              {input && (
                <button
                  type="button"
                  className="bth-clear-input"
                  aria-label="مسح الرابط"
                  onClick={() => {
                    setInput("");
                    setError("");
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button type="submit" className="bth-gold-btn bth-play-submit">
              <Play className="h-4 w-4 fill-current" />
              <span>تشغيل</span>
            </button>
          </div>

          {error ? (
            <p id="bth-stream-help" role="alert" className="bth-form-error">
              {error}
            </p>
          ) : (
            <p id="bth-stream-help" className="bth-form-helper">
              يبدأ البث مكتوماً؛ شغّل الصوت من المشغل. لإدارة القنوات الرئيسية للزوار افتح لوحة التحكم.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}