import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { Link2, MonitorPlay, Play, Radio, RefreshCw, ShieldCheck, X } from "lucide-react";
import { BthPlayer, type BthPlaybackState } from "@/components/bth-player";
import { BTH_PROVIDERS, parseBthStream, type BthProviderChip, type BthStream } from "@/lib/bth-stream";

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
  loading: { ar: "اتصال", code: "SYNC" },
  live: { ar: "مباشر", code: "LIVE" },
  error: { ar: "متوقف", code: "ERR" },
};

function BroadcastPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<BthProviderChip["id"]>("youtube");
  const [stream, setStream] = useState<BthStream | null>(null);
  const [playbackState, setPlaybackState] = useState<BthPlaybackState>("idle");
  const [muted, setMuted] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  const activeChip = BTH_PROVIDERS.find((p) => p.id === selectedProvider) ?? BTH_PROVIDERS[0];
  const statusChip = STATUS_COPY[playbackState];

  const startStream = (rawUrl: string, nextMuted: boolean) => {
    const host = typeof window === "undefined" ? "almoghani.net" : window.location.hostname;
    const parsed = parseBthStream(rawUrl, host, nextMuted);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError("");
    setStream(parsed.stream);
    if (parsed.stream.provider !== "direct") setSelectedProvider(parsed.stream.provider);
    setRefreshKey((k) => k + 1);
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
    if (!stream) {
      if (input.trim()) startStream(input, muted);
      return;
    }
    setError("");
    setRefreshKey((k) => k + 1);
  };

  const handleClear = () => {
    setInput("");
    setStream(null);
    setError("");
    setMuted(true);
    setPlaybackState("idle");
  };

  const broadcastHeading = stream ? `بث ${stream.label}` : "شاشتي — البث الشخصي";
  const broadcastSubtitle = stream
    ? playbackState === "error"
      ? "تعذر تشغيل الرابط الحالي؛ أعد المحاولة أو استبدل الرابط"
      : "رابط نشط لهذه الجلسة فقط"
    : "استوديو البث الشخصي — الصق رابط البث للبدء";

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
          stream={stream}
          refreshKey={refreshKey}
          muted={muted}
          onToggleMute={handleToggleMute}
          onRefresh={handleRefresh}
          onStateChange={setPlaybackState}
        />

        <section className="bth-info-bar" aria-label="حالة البث الحالي">
          <div className="bth-info-copy">
            <h1>{broadcastHeading}</h1>
            <p>{broadcastSubtitle}</p>
          </div>
          <div className="bth-info-actions">
            {stream && (
              <button type="button" className="bth-ghost-btn" onClick={handleClear}>
                <X className="h-4 w-4" />
                <span>إيقاف</span>
              </button>
            )}
            <button
              type="button"
              className="bth-refresh-btn"
              onClick={handleRefresh}
              disabled={!stream && !input.trim()}
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