import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Eye, Radio, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { saveBthPublicBroadcast } from "@/lib/bth-broadcast.functions";
import {
  getBthLiveViewerCount,
  setBthAudienceLive,
  setBthPublicState,
  stopBthSessionBroadcaster,
  stopBthSessionLocalMedia,
  useBthSession,
} from "@/lib/bth-session";
import { formatBthViewerCount, getBthShareUrl } from "@/lib/bth-stream";
import { notifyBthPublicRefresh } from "@/lib/bth-webrtc";

export function BthFloatingDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = useBthSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveBroadcastFn = useServerFn(saveBthPublicBroadcast);
  const [copied, setCopied] = useState(false);
  const [stopping, setStopping] = useState(false);

  const visible = pathname !== "/bth" && (session.audienceLive || Boolean(session.localMedia));
  const viewerCount = getBthLiveViewerCount(session);

  useEffect(() => {
    const video = videoRef.current;
    if (!visible || !video || !session.localMedia) return;
    video.srcObject = session.localMedia;
    video.muted = true;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [visible, session.localMedia]);

  if (!visible) return null;

  const handleCopy = async () => {
    const url = getBthShareUrl(window.location.origin, window.location.hostname);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const wasLive = session.audienceLive;
      stopBthSessionBroadcaster();
      stopBthSessionLocalMedia();
      setBthAudienceLive(false);
      if (wasLive) {
        const res = await saveBroadcastFn({ data: { action: "stop" } });
        setBthPublicState(res.state);
        await notifyBthPublicRefresh();
      }
    } catch {
      /* keep stopped locally if network fails */
    } finally {
      setStopping(false);
    }
  };

  return (
    <aside className="bth-floating-dock" dir="rtl" aria-label="البث المباشر قيد التشغيل">
      {session.localMedia && <video ref={videoRef} muted autoPlay playsInline className="bth-dock-thumb" aria-hidden="true" />}
      <div className="bth-dock-info">
        <span className="bth-dock-title" data-live={session.audienceLive ? "true" : "false"}>
          <span className="bth-dock-dot" aria-hidden="true" />
          <span>{session.audienceLive ? "بث مباشر" : "معاينة البث"}</span>
        </span>
        {session.audienceLive && (
          <span className="bth-dock-viewers">
            <Eye className="h-3.5 w-3.5" />
            <span>{formatBthViewerCount(viewerCount)}</span>
          </span>
        )}
      </div>
      <div className="bth-dock-actions">
        <button type="button" className="bth-dock-btn" onClick={() => void handleCopy()} aria-label="نسخ رابط البث">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <Link to="/bth" className="bth-dock-btn bth-dock-return">
          <Radio className="h-3.5 w-3.5" />
          <span>العودة للبث</span>
        </Link>
        <button type="button" className="bth-dock-btn bth-dock-stop" disabled={stopping} onClick={() => void handleStop()} aria-label="إنهاء البث">
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    </aside>
  );
}