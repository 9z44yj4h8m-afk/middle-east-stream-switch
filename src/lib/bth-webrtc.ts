import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const BTH_SIGNAL_CHANNEL = "almoghani-bth-live-signal";
export const BTH_NOTIFY_CHANNEL = "almoghani-bth-public-notify";
const MAX_PEERS = 12;
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type SignalPayload = {
  sessionId?: string;
  viewerId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export function startBthBroadcaster(
  stream: MediaStream,
  sessionId: string,
  onPeerCountChange?: (count: number) => void,
): { stop: () => void } {
  const peers = new Map<string, RTCPeerConnection>();
  let closed = false;
  const emitCount = () => onPeerCountChange?.(peers.size);

  const dropPeer = (viewerId: string) => {
    const pc = peers.get(viewerId);
    if (!pc) return;
    peers.delete(viewerId);
    try {
      pc.close();
    } catch {
      /* ignore */
    }
    emitCount();
  };

  const channel: RealtimeChannel = supabase
    .channel(BTH_SIGNAL_CHANNEL, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "viewer-join" }, async ({ payload }) => {
      if (closed) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId !== sessionId || !data.viewerId) return;
      const viewerId = data.viewerId;
      if (peers.has(viewerId)) dropPeer(viewerId);
      if (peers.size >= MAX_PEERS) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peers.set(viewerId, pc);
      emitCount();

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.onicecandidate = (ev) => {
        if (closed || !ev.candidate) return;
        void channel.send({
          type: "broadcast",
          event: "host-ice",
          payload: { sessionId, viewerId, candidate: ev.candidate.toJSON() },
        });
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) dropPeer(viewerId);
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (closed) return;
        await channel.send({
          type: "broadcast",
          event: "host-offer",
          payload: { sessionId, viewerId, sdp: offer },
        });
      } catch {
        dropPeer(viewerId);
      }
    })
    .on("broadcast", { event: "viewer-answer" }, async ({ payload }) => {
      if (closed) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId !== sessionId || !data.viewerId || !data.sdp) return;
      const pc = peers.get(data.viewerId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch {
        dropPeer(data.viewerId);
      }
    })
    .on("broadcast", { event: "viewer-ice" }, async ({ payload }) => {
      if (closed) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId !== sessionId || !data.viewerId || !data.candidate) return;
      const pc = peers.get(data.viewerId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        /* ignore late candidates */
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && !closed) {
        void notifyBthPublicRefresh();
      }
    });

  return {
    stop: () => {
      if (closed) return;
      closed = true;
      for (const viewerId of Array.from(peers.keys())) dropPeer(viewerId);
      void channel.send({ type: "broadcast", event: "host-ended", payload: { sessionId } });
      void notifyBthPublicRefresh();
      void supabase.removeChannel(channel);
    },
  };
}

export function startBthViewer(
  sessionId: string,
  callbacks: {
    onStream: (stream: MediaStream) => void;
    onEnded: () => void;
    onError: (message: string) => void;
  },
): { stop: () => void } {
  const viewerId = `v-${Math.random().toString(36).slice(2, 10)}`;
  let closed = false;
  let pc: RTCPeerConnection | null = null;
  let gotStream = false;
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  const cleanupPc = () => {
    if (!pc) return;
    try {
      pc.close();
    } catch {
      /* ignore */
    }
    pc = null;
  };

  const room: RealtimeChannel = supabase
    .channel(BTH_SIGNAL_CHANNEL, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "host-offer" }, async ({ payload }) => {
      if (closed) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId !== sessionId || data.viewerId !== viewerId || !data.sdp) return;
      cleanupPc();
      const nextPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc = nextPc;
      const remoteStream = new MediaStream();

      nextPc.ontrack = (ev) => {
        if (closed) return;
        ev.streams[0]?.getTracks().forEach((t) => {
          if (!remoteStream.getTracks().some((x) => x.id === t.id)) remoteStream.addTrack(t);
        });
        if (!remoteStream.getTracks().some((x) => x.id === ev.track.id)) remoteStream.addTrack(ev.track);
        gotStream = true;
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
        callbacks.onStream(remoteStream);
      };
      nextPc.onicecandidate = (ev) => {
        if (closed || !ev.candidate) return;
        void room.send({
          type: "broadcast",
          event: "viewer-ice",
          payload: { sessionId, viewerId, candidate: ev.candidate.toJSON() },
        });
      };
      nextPc.onconnectionstatechange = () => {
        if (closed) return;
        if (nextPc.connectionState === "failed") {
          callbacks.onError("تعذر الاتصال بالبث المباشر؛ أعد التحديث للمحاولة.");
        }
      };

      try {
        await nextPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await nextPc.createAnswer();
        await nextPc.setLocalDescription(answer);
        if (closed) return;
        await room.send({
          type: "broadcast",
          event: "viewer-answer",
          payload: { sessionId, viewerId, sdp: answer },
        });
      } catch {
        callbacks.onError("تعذر فتح البث المباشر حالياً.");
      }
    })
    .on("broadcast", { event: "host-ice" }, async ({ payload }) => {
      if (closed || !pc) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId !== sessionId || data.viewerId !== viewerId || !data.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        /* ignore */
      }
    })
    .on("broadcast", { event: "host-ended" }, ({ payload }) => {
      if (closed) return;
      const data = (payload ?? {}) as SignalPayload;
      if (data.sessionId === sessionId) {
        cleanupPc();
        callbacks.onEnded();
      }
    })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED" || closed) return;
      const requestJoin = () => {
        if (closed || gotStream) return;
        void room.send({ type: "broadcast", event: "viewer-join", payload: { sessionId, viewerId } });
      };
      requestJoin();
      let tries = 0;
      retryTimer = setInterval(() => {
        tries += 1;
        if (closed || gotStream || tries >= 5) {
          if (retryTimer) clearInterval(retryTimer);
          retryTimer = null;
          if (!closed && !gotStream) {
            callbacks.onError("البث غير متصل حالياً أو انتهى من جهاز المذيع.");
          }
          return;
        }
        requestJoin();
      }, 2500);
    });

  return {
    stop: () => {
      if (closed) return;
      closed = true;
      if (retryTimer) clearInterval(retryTimer);
      cleanupPc();
      void supabase.removeChannel(room);
    },
  };
}

export async function notifyBthPublicRefresh(): Promise<void> {
  const ch = supabase.channel(BTH_NOTIFY_CHANNEL, { config: { broadcast: { self: false } } });
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      void supabase.removeChannel(ch);
      resolve();
    }, 1500);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.send({ type: "broadcast", event: "public-refresh", payload: {} }).finally(() => {
          clearTimeout(timeout);
          void supabase.removeChannel(ch);
          resolve();
        });
      }
    });
  });
}