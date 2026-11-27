import { useSyncExternalStore } from "react";
import type { BthPresenceRole, BthPublicBroadcast, BthStream } from "./bth-stream";
import { startBthBroadcaster, startBthPresence, type BthPresenceHandle } from "./bth-webrtc";

export type BthSessionSnapshot = {
  stream: BthStream | null;
  localMedia: MediaStream | null;
  captureSource: "screen" | "camera";
  micEnabled: boolean;
  audienceLive: boolean;
  publicState: BthPublicBroadcast | null;
  peerCount: number;
  presenceViewers: number;
  minimized: boolean;
};

const initialSnapshot: BthSessionSnapshot = {
  stream: null,
  localMedia: null,
  captureSource: "screen",
  micEnabled: false,
  audienceLive: false,
  publicState: null,
  peerCount: 0,
  presenceViewers: 0,
  minimized: false,
};

let snapshot: BthSessionSnapshot = initialSnapshot;
let broadcaster: { stop: () => void } | null = null;
let presence: BthPresenceHandle | null = null;
let pageMounted = false;
let wakeLock: { release: () => Promise<void> } | null = null;
let unloadBound = false;
let visibilityBound = false;

const listeners = new Set<() => void>();

function emit(next: Partial<BthSessionSnapshot>) {
  snapshot = { ...snapshot, ...next };
  syncBackgroundGuards();
  for (const fn of listeners) fn();
}

function handleBeforeUnload(ev: BeforeUnloadEvent) {
  if (snapshot.audienceLive && snapshot.localMedia) {
    ev.preventDefault();
    ev.returnValue = "";
  }
}

async function requestWakeLock() {
  if (typeof navigator === "undefined" || wakeLock) return;
  const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
  if (!nav.wakeLock?.request) return;
  try {
    wakeLock = await nav.wakeLock.request("screen");
  } catch {
    /* ignore unsupported/background errors */
  }
}

function releaseWakeLock() {
  if (!wakeLock) return;
  const current = wakeLock;
  wakeLock = null;
  void current.release().catch(() => {});
}

function handleVisibilityChange() {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "visible" && (snapshot.audienceLive || snapshot.localMedia)) {
    void requestWakeLock();
  }
}

function resolvePresenceRole(): BthPresenceRole {
  if (snapshot.audienceLive) return "host";
  if (pageMounted && snapshot.publicState?.active) return "viewer";
  return "idle";
}

function syncPresence() {
  const shouldStayConnected = pageMounted || snapshot.audienceLive || Boolean(snapshot.localMedia);
  if (!shouldStayConnected) {
    if (presence) {
      presence.stop();
      presence = null;
    }
    return;
  }
  const role = resolvePresenceRole();
  if (!presence) {
    presence = startBthPresence(role, (count) => {
      if (snapshot.presenceViewers !== count) {
        snapshot = { ...snapshot, presenceViewers: count };
        for (const fn of listeners) fn();
      }
    });
  } else {
    presence.setRole(role);
  }
}

function syncBackgroundGuards() {
  if (typeof window === "undefined") return;
  const needsGuard = Boolean(snapshot.localMedia && snapshot.audienceLive);
  if (needsGuard && !unloadBound) {
    window.addEventListener("beforeunload", handleBeforeUnload);
    unloadBound = true;
  } else if (!needsGuard && unloadBound) {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    unloadBound = false;
  }

  const needsWake = Boolean(snapshot.localMedia || snapshot.audienceLive);
  if (needsWake) {
    void requestWakeLock();
    if (!visibilityBound && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      visibilityBound = true;
    }
  } else {
    releaseWakeLock();
    if (visibilityBound && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityBound = false;
    }
  }
  syncPresence();
}

export function getBthSession(): BthSessionSnapshot {
  return snapshot;
}

export function subscribeBthSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBthSession(): BthSessionSnapshot {
  return useSyncExternalStore(subscribeBthSession, getBthSession, () => initialSnapshot);
}

export function setBthPageMounted(mounted: boolean) {
  pageMounted = mounted;
  syncPresence();
}

export function setBthCaptureSource(captureSource: "screen" | "camera") {
  emit({ captureSource });
}

export function setBthMicEnabled(micEnabled: boolean) {
  emit({ micEnabled });
}

export function setBthMinimized(minimized: boolean) {
  emit({ minimized });
}

export function setBthStream(stream: BthStream | null) {
  emit({ stream });
}

export function setBthPublicState(publicState: BthPublicBroadcast | null) {
  emit({ publicState });
}

export function setBthAudienceLive(audienceLive: boolean) {
  emit({ audienceLive });
}

export function setBthLocalMedia(media: MediaStream | null, onTrackEnded?: () => void) {
  if (snapshot.localMedia && snapshot.localMedia !== media) {
    snapshot.localMedia.getTracks().forEach((t) => t.stop());
  }
  if (media && onTrackEnded) {
    const primaryVideo = media.getVideoTracks()[0];
    if (primaryVideo) {
      primaryVideo.addEventListener("ended", onTrackEnded, { once: true });
    }
  }
  emit({ localMedia: media });
}

export function startBthSessionBroadcaster(media: MediaStream, sessionId: string) {
  broadcaster?.stop();
  broadcaster = startBthBroadcaster(media, sessionId, (peerCount) => {
    emit({ peerCount });
  });
}

export function stopBthSessionBroadcaster() {
  broadcaster?.stop();
  broadcaster = null;
  emit({ peerCount: 0, audienceLive: false });
}

export function stopBthSessionLocalMedia() {
  broadcaster?.stop();
  broadcaster = null;
  snapshot.localMedia?.getTracks().forEach((t) => t.stop());
  emit({ localMedia: null, peerCount: 0 });
}

export function getBthLiveViewerCount(s: BthSessionSnapshot): number {
  if (!s.audienceLive && !s.publicState?.active) return 0;
  return Math.max(s.presenceViewers, s.peerCount);
}