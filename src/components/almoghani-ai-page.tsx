import { Link } from "@tanstack/react-router";
import { ArrowUp, Check, Copy, Home, Plus, Settings, Sparkles, Square, Library, Mail, UserRound, LogOut, BookOpen, Tv, PenLine, Globe } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";

import { AiWorkspaceDialogs } from "@/components/ai-workspace-dialogs";
import { useMember } from "@/components/member-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { parseAiLibrary, type AiConversation } from "@/lib/ai-workspace";
import { AiMessageBody } from "@/components/ai-message-body";
import { Button } from "@/components/ui/button";
import {
  contrastOnHex,
  defaultAiPageConfig,
  resolvedAiLogoSrc,
  useAiPageConfig,
} from "@/lib/ai-page-config";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const STORAGE_KEY = "almoghani_ai_chat_v1";

function loadSaved(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key);
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
  const { user, ready } = useMember();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const storageKey = `${STORAGE_KEY}:${user?.id ?? "guest"}`;
  const [view, setView] = useState<"library" | "contact" | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [chatId, setChatId] = useState("");
  const { data: loadedConfig } = useAiPageConfig();
  const savedConfig = loadedConfig ?? defaultAiPageConfig;
  const active = savedConfig;
  const logoSrc = resolvedAiLogoSrc(active);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [hydratedKey, setHydratedKey] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ready) return;
    stopReply();
    setMessages(loadSaved(storageKey));
    try {
      setConversations(parseAiLibrary(JSON.parse(localStorage.getItem(`${storageKey}:library`) ?? "[]")));
      setChatId(localStorage.getItem(`${storageKey}:id`) || crypto.randomUUID());
    } catch { setConversations([]); setChatId(crypto.randomUUID()); }
    setHydrated(true);
    setHydratedKey(storageKey);
  }, [ready, storageKey]);

  useEffect(() => {
    if (!hydrated || hydratedKey !== storageKey || streaming || !chatId) return;
    const completed = messages.filter((m) => m.content.trim().length > 0).slice(-30);
    try {
      localStorage.setItem(storageKey, JSON.stringify(completed));
      localStorage.setItem(`${storageKey}:id`, chatId);
    } catch {
      /* storage unavailable */
    }
    if (!completed.length) return;
    const chat: AiConversation = { id: chatId, title: (completed.find((m) => m.role === "user")?.content || "محادثة جديدة").slice(0, 120), messages: completed, updated_at: new Date().toISOString() };
    setConversations((prev) => {
      const next = [chat, ...prev.filter((c) => c.id !== chatId)].slice(0, 100);
      try { localStorage.setItem(`${storageKey}:library`, JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
    if (user) void supabase.from("ai_conversations").upsert({ ...chat, user_id: user.id }).then(({ error: saveError }) => {
      if (saveError) setError("تعذّر حفظ المحادثة في حسابك؛ النسخة محفوظة على هذا الجهاز.");
      else void qc.invalidateQueries({ queryKey: ["ai-library", user.id] });
    });
  }, [messages, hydrated, hydratedKey, streaming, chatId, storageKey, user?.id, qc]);

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
    setChatId(crypto.randomUUID());
    resizeInput(textareaRef.current);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }

  function selectChat(chat: AiConversation) { stopReply(); setChatId(chat.id); setMessages(chat.messages); setError(""); setInput(""); }
  function deleteChat(id: string) {
    setConversations((prev) => { const next = prev.filter((chat) => chat.id !== id); try { localStorage.setItem(`${storageKey}:library`, JSON.stringify(next)); } catch { /* storage unavailable */ } return next; });
    if (chatId === id) startNewChat();
  }
  async function signOut() { stopReply(); setHydrated(false); setMessages([]); setConversations([]); await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }

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
    if (!user) {
      setError("سجّل الدخول أولًا لاستخدام المساعد الذكي.");
      return;
    }
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("سجّل الدخول أولًا لاستخدام المساعد الذكي.");
      const userTurns = history.filter((m) => m.role === "user").map(({ content }) => ({ role: "user" as const, content }));
      const res = await fetch("/api/public/almoghani-ai", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: userTurns }),
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
    "--ai-font-size": `${active.fontSize}px`,
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
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <Home />
              <span>{active.homeLabel}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="almoghani-ai-settings-btn"
            aria-label="إعدادات الصفحة"
            title="إعدادات الصفحة"
          >
            <Link to="/admin_ai"><Settings /></Link>
          </Button>
        </div>
      </header>

      <nav className="ai-workspace-nav" aria-label="قائمة المساعد">
        <Button onClick={startNewChat}><Plus /><span>محادثة جديدة</span></Button>
        <Button variant="ghost" onClick={() => setView("library")}><Library /><span>المكتبة</span></Button>
        <Button variant="ghost" onClick={() => setView("contact")}><Mail /><span>راسلني</span></Button>
        <div className="ai-account-actions">{user ? <><span className="ai-account-name"><UserRound />{user.email}</span><Button variant="ghost" size="icon" onClick={() => void signOut()} title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut /></Button></> : <Button asChild variant="outline"><Link to="/auth"><UserRound />دخول / إنشاء حساب</Link></Button>}</div>
      </nav>

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
                  <Button variant="outline" key={sec.id} type="button" className="almoghani-ai-prompt" onClick={() => void sendMessage(sec.prompt)}>
                    {sec.icon === "book" ? <BookOpen /> : sec.icon === "tv" ? <Tv /> : sec.icon === "pen" ? <PenLine /> : sec.icon === "globe" ? <Globe /> : <Sparkles />}
                    <span>{sec.title}{sec.description && <small>{sec.description}</small>}</span>
                  </Button>
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

      <AiWorkspaceDialogs view={view} onClose={() => setView(null)} config={active} theme={shellStyle} localConversations={conversations} onSelect={selectChat} onDelete={deleteChat} />
    </div>
  );
}