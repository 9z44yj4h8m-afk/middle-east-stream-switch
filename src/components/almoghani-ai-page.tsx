import { Link } from "@tanstack/react-router";
import { ArrowUp, Check, Copy, Home, RotateCcw, Settings, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";

import { AiControlPanel } from "@/components/ai-control-panel";
import { AiMessageBody } from "@/components/ai-message-body";
import { Button } from "@/components/ui/button";
import {
  contrastOnHex,
  defaultAiPageConfig,
  resolvedAiLogoSrc,
  useAiPageConfig,
  type AiPageConfig,
} from "@/lib/ai-page-config";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const STORAGE_KEY = "almoghani_ai_chat_v1";

function loadSaved(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m.id === "string" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .slice(-30);
  } catch {
    return [];
  }
}

export function AlmoghaniAiPage() {
  const { data: loadedConfig } = useAiPageConfig();
  const savedConfig = loadedConfig ?? defaultAiPageConfig;
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<AiPageConfig | null>(null);
  const [previewLogo, setPreviewLogo] = useState("");
  const active = previewDraft ?? savedConfig;
  const logoSrc = previewLogo || resolvedAiLogoSrc(active);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(loadSaved());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || streaming) return;
    try {
      const completed = messages.filter((m) => m.content.trim().length > 0).slice(-30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch {
      /* storage unavailable */
    }
  }, [messages, hydrated, streaming]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function resizeInput(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function stopReply() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }

  function startNewChat() {
    stopReply();
    setMessages([]);
    setError("");
    setInput("");
    resizeInput(textareaRef.current);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  async function copyReply(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || streaming) return;
    setError("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const assistantId = `a-${Date.now() + 1}`;
    const history = [...messages.filter((m) => m.content.trim().length > 0).slice(-28), userMsg];

    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/public/almoghani-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(errBody?.error || "تعذّر الاتصال بالمساعد، حاول مرة أخرى.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          let evt: { type?: string; text?: string; message?: string };
          try {
            evt = JSON.parse(line.slice(5).trim()) as typeof evt;
          } catch {
            continue;
          }
          if (evt.type === "delta" && evt.text) {
            const piece = evt.text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + piece } : m)),
            );
          } else if (evt.type === "error" && evt.message) {
            setError(evt.message);
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError((err as Error)?.message || "تعذّر الحصول على رد، حاول مرة أخرى.");
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content.trim())));
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  const shellStyle = {
    "--background": active.bgColor,
    "--surface": active.surfaceColor,
    "--foreground": active.textColor,
    "--muted-foreground": active.mutedTextColor,
    "--primary": active.accentColor,
    "--primary-foreground": contrastOnHex(active.accentColor),
    "--ai-heading": active.headingColor,
    "--ai-font": `"${active.fontFamily}", sans-serif`,
  } as CSSProperties;

  return (
    <div dir="rtl" className="almoghani-ai-shell" style={shellStyle}>
      <header className="almoghani-ai-header">
        <div className="almoghani-ai-brand">
          <img src={logoSrc} alt="" className="almoghani-ai-emblem" />
          <div>
            <strong>{active.brandTitle}</strong>
            <small>{active.brandSubtitle}</small>
          </div>
        </div>
        <div className="almoghani-ai-actions">
          {messages.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={startNewChat}>
              <RotateCcw />
              <span>{active.newChatLabel}</span>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <Home />
              <span>{active.homeLabel}</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="almoghani-ai-settings-btn"
            onClick={() => setPanelOpen(true)}
            aria-label="إعدادات الصفحة"
            title="إعدادات الصفحة"
          >
            <Settings />
          </Button>
        </div>
      </header>

      <main ref={listRef} className="almoghani-ai-scroll" aria-live="polite">
        {messages.length === 0 ? (
          <section className="almoghani-ai-welcome">
            <div className="almoghani-ai-welcome-badge">
              <img src={logoSrc} alt={active.welcomeTitle} />
            </div>
            <h1>{active.welcomeTitle}</h1>
            <p>{active.welcomeSubtitle}</p>
            {active.sections.length > 0 && (
              <div className={active.layoutStyle === "list" ? "almoghani-ai-prompts is-list" : "almoghani-ai-prompts"}>
                {active.sections.map((sec) => (
                  <button key={sec.id} type="button" className="almoghani-ai-prompt" onClick={() => void sendMessage(sec.prompt)}>
                    <Sparkles aria-hidden="true" />
                    <span>{sec.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="almoghani-ai-thread">
            {messages.map((m) => (
              <article key={m.id} className={m.role === "user" ? "almoghani-ai-turn is-user" : "almoghani-ai-turn is-assistant"}>
                {m.role === "assistant" && (
                  <div className="almoghani-ai-meta">
                    <span className="almoghani-ai-bot-tag">
                      <Sparkles aria-hidden="true" />
                      <span>{active.brandTitle}</span>
                    </span>
                    {m.content.trim().length > 0 && !streaming && (
                      <button
                        type="button"
                        className="almoghani-ai-copy"
                        onClick={() => void copyReply(m.id, m.content)}
                        aria-label="نسخ الرد"
                      >
                        {copiedId === m.id ? <Check /> : <Copy />}
                        <span>{copiedId === m.id ? "تم النسخ" : "نسخ"}</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="almoghani-ai-bubble">
                  {m.role === "user" ? (
                    <p>{m.content}</p>
                  ) : m.content ? (
                    <AiMessageBody content={m.content} />
                  ) : (
                    <span className="almoghani-ai-dots" aria-label="جاري الكتابة">
                      <span /><span /><span />
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {error && (
        <div role="alert" className="almoghani-ai-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="إغلاق التنبيه">×</button>
        </div>
      )}

      <form className="almoghani-ai-composer" onSubmit={handleSubmit}>
        <div className="almoghani-ai-input-wrap">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeInput(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder={active.inputPlaceholder}
            aria-label="اكتب سؤالك للمساعد الذكي"
            maxLength={4000}
          />
          {streaming ? (
            <Button type="button" variant="outline" size="icon" className="almoghani-ai-send" onClick={stopReply} aria-label="إيقاف الرد">
              <Square />
            </Button>
          ) : (
            <Button type="submit" variant="broadcast" size="icon" className="almoghani-ai-send" disabled={!input.trim()} aria-label="إرسال السؤال">
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>

      <AiControlPanel
        open={panelOpen}
        savedConfig={savedConfig}
        onClose={() => setPanelOpen(false)}
        onPreviewChange={(d, logo) => {
          setPreviewDraft(d);
          setPreviewLogo(logo);
        }}
      />
    </div>
  );
}