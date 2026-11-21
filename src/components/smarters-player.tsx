import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SmartersPlayer({ url, name }: { url: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let cleanup = () => {};
    const controller = new AbortController();
    setError(""); setLoading(true);
    const failed = () => { if (!disposed) { setLoading(false); setError("تعذّر تشغيل البث؛ قد يرفض مزوّد الاشتراك الاتصال من الموقع."); } };
    const ready = () => { setLoading(false); setError(""); };
    video.addEventListener("playing", ready);
    video.addEventListener("error", failed);
    // Probe the same authenticated relay to show upstream failures promptly.
    void (async () => {
      try {
        const response = await fetch(url, { headers: { Range: "bytes=0-1023" }, signal: controller.signal });
        if (!response.ok) { failed(); await response.body?.cancel(); return; }
        const type = response.headers.get("content-type") ?? "";
        const hls = type.includes("mpegurl");
        await response.body?.cancel();
        if (disposed) return;
        video.disableRemotePlayback = true;
        if (!hls || video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          void video.play().catch(() => setLoading(false));
          return;
        }
        const { default: Hls } = await import("hls.js");
        if (disposed) return;
        if (!Hls.isSupported()) return failed();
        const player = new Hls({ enableWorker: true });
        cleanup = () => player.destroy();
        player.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => setLoading(false)); });
        player.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) failed(); });
        player.loadSource(url); player.attachMedia(video);
      } catch { if (!disposed) failed(); }
    })();
    return () => {
      disposed = true; controller.abort(); cleanup();
      video.removeEventListener("playing", ready); video.removeEventListener("error", failed);
      video.removeAttribute("src"); video.load();
    };
  }, [url, retry]);
  return <div className="mt-4">
    <div className="relative aspect-video overflow-hidden rounded-md bg-surface-deep">
      <video ref={videoRef} aria-label={`مشاهدة ${name}`} className="h-full w-full" controls autoPlay muted playsInline />
      {loading && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-foreground">جارٍ تشغيل البث…</p>}
    </div>
    {error && <div className="mt-3 space-y-3"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}><RefreshCw className="h-4 w-4" />إعادة المحاولة</Button></div>}
  </div>;
}