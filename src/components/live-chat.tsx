import { VoiceRoom, prefetchVoiceTurn, unlockVoiceAudio } from "@/components/voice-room";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, Volume2, Loader2, Users, MessageCircle, Mic, MicOff } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "./member-provider";
import { botReply, botBanter } from "@/lib/chat-bots.functions";
import { useSiteConfig } from "@/lib/site-config";
import { defaultChatAppearance, requestedChatEmojis } from "@/lib/chat-appearance";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatAppearanceStyle } from "@/components/chat-appearance-style";
import { BotAvatar } from "@/components/bot-avatar";
import { withoutArabicDiacritics } from "@/lib/chat-text";
import { useChatControl, useChatBans, isActiveBan, defaultChatControl } from "@/lib/chat-control";
import { Home, Settings, LogOut, Send, Search, Image as ImageIcon } from "lucide-react";

const BOT_LINES = ["هلا والله بالجميع 👋 وش تتابعون الحين؟", "مين يتابع الرياضة اليوم؟ ⚽", "أحد شاف مسلسل بدوي حلو؟ اقترحوا لنا 🐎", "لا تنسون تجربون شات ALMOGHANI AI 🤖", "وش أحلى قناة عندكم في الموقع؟"];

type Msg = { id: string; user_id: string | null; display_name: string; body: string; created_at: string; room_id?: string | null };
type Room = { id: string; name: string };
const EMOJIS = ["👏", "🔥", "💙", "✨"] as const;

export function ago(d: string) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `قبل ${Math.floor(s / 60)}د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)}س`;
  return `قبل ${Math.floor(s / 86400)}ي`;
}

export function LiveChat({ onIncoming, bare = false, voice = false }: { onIncoming?: (m: { display_name: string; body: string }) => void; bare?: boolean; voice?: boolean } = {}) {
  const navigate = useNavigate();
  const incomingRef = useRef(onIncoming); incomingRef.current = onIncoming;
  const { user } = useMember();
  const { data: siteConfig } = useSiteConfig();
  const appearance = siteConfig?.chatAppearance ?? defaultChatAppearance;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const control = useChatControl().data ?? defaultChatControl;
  const bans = useChatBans().data ?? [];
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  async function playVoice(id: string) {
    audioRef.current?.pause();
    setVoiceLoading(id);
    try {
      const res = await fetch("/api/public/bot-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: id }) });
      if (!res.ok) throw new Error();
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audioRef.current = audio;
      await audio.play();
    } catch { setError("تعذّر تشغيل الصوت، حاول لاحقًا."); } finally { setVoiceLoading(null); }
  }
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const voiceOnRef = useRef(false);
  async function drainQueue() {
    if (playingRef.current) return;
    playingRef.current = true;
    while (voiceOnRef.current && queueRef.current.length) {
      const id = queueRef.current.shift()!;
      try {
        const res = await fetch("/api/public/bot-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: id }) });
        if (!res.ok) continue;
        const audio = new Audio(URL.createObjectURL(await res.blob()));
        audioRef.current = audio;
        await new Promise<void>((done) => { audio.onended = () => done(); audio.onerror = () => done(); audio.play().catch(() => done()); });
      } catch { /* skip this line */ }
    }
    playingRef.current = false;
  }
  const isBotName = (raw: string) => { const n = siteConfig?.botNameAliases[raw] ?? raw; return !!(siteConfig?.chatNames.includes(n) || siteConfig?.botNameAliases[raw] || siteConfig?.botAvatars[n]); };
  const isBotRef = useRef(isBotName); isBotRef.current = isBotName;
  const listRef = useRef<HTMLDivElement>(null);
  const [guestName, setGuestName] = useState("");
  const [entered, setEntered] = useState(false);
  const myBan = bans.find((b) => isActiveBan(b) && b.name.trim().toLowerCase() === guestName.trim().toLowerCase());
  const bannedOut = !!myBan && myBan.kind === "ban";
  useEffect(() => { prefetchVoiceTurn(); }, [voice]);
  voiceOnRef.current = false; // voice page uses VoiceRoom turns instead
  useEffect(() => { if (!voice || !entered) { audioRef.current?.pause(); queueRef.current = []; } }, [voice, entered]);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [botLine, setBotLine] = useState(BOT_LINES[0]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [sideTab, setSideTab] = useState<"people" | "room">("people");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const onMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [roomError, setRoomError] = useState("");
  const activeRoom = rooms.find((r) => r.id === roomId)?.name ?? "الدردشة العامة";
  const emojis = [...new Set([...requestedChatEmojis, ...appearance.emojis])];
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const displayName = (name: string) => siteConfig?.botNameAliases[name] ?? name;
  const names = [...new Set([...(roomId ? [] : siteConfig?.chatNames ?? []), ...msgs.map((m) => displayName(m.display_name) || "عضو")])].filter((name) => name.includes(peopleQuery));
  useEffect(() => {
    const load = () => { void supabase.from("chat_rooms").select("id,name").order("created_at").then(({ data }) => setRooms(data ?? [])); };
    load(); const timer = setInterval(load, 15000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % BOT_LINES.length; setBotLine(BOT_LINES[i]); }, 90000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const run = () => { if (!voice && !roomId && document.visibilityState === "visible") void botBanter().catch(() => {}); };
    const first = setTimeout(run, 8000);
    const t = setInterval(run, voice && entered ? 20000 : 60000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [roomId, voice, entered]);
  useEffect(() => {
    if (!entered || !guestName.trim()) return;
    let last: string | null = null; let ready = false;
    const check = () => { void supabase.from("chat_room_moves").select("room_id,moved_at").eq("name", guestName.trim()).maybeSingle().then(({ data }) => {
      const stamp = data?.moved_at ?? ""; if (!ready) { ready = true; last = stamp; return; }
      if (data && stamp !== last) { last = data.moved_at; setRoomId(data.room_id ?? null); setSelectedRoomId(data.room_id ?? null); }
    }); };
    check(); const t = window.setInterval(check, 5000);
    return () => window.clearInterval(t);
  }, [entered, guestName]);
  useEffect(() => {
    setGuestName(localStorage.getItem("chat-name") ?? "");
    try { setMyIds(JSON.parse(localStorage.getItem("chat-mine") ?? "[]")); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let alive = true; setMsgs([]);
    const query = supabase.from("chat_messages").select("id,user_id,display_name,body,created_at,room_id");
    void (roomId ? query.eq("room_id", roomId) : query.is("room_id", null)).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (alive) setMsgs((data ?? []).reverse()); });
    void supabase.from("chat_reactions").select("emoji,count").then(({ data }) => setReactions(Object.fromEntries((data ?? []).map((r) => [r.emoji, Number(r.count)]))));
    const ch = supabase.channel(`live-chat-${roomId ?? "general"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => setMsgs((m) => { const n = p.new as Msg; if ((n.room_id ?? null) !== roomId || m.some((x) => x.id === n.id)) return m; incomingRef.current?.(n); if (voiceOnRef.current && isBotRef.current(n.display_name)) { queueRef.current = [...queueRef.current.slice(-4), n.id]; void drainQueue(); } return [...m.slice(-99), n]; }))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => setMsgs((m) => m.filter((x) => x.id !== (p.old as { id: string }).id)))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, (p) => { const r = p.new as { emoji: string; count: number }; if (r?.emoji) setReactions((x) => ({ ...x, [r.emoji]: Number(r.count) })); })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [roomId]);

  useEffect(() => {
    if (user) void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
    else setIsAdmin(false);
  }, [user?.id]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !entered) return;
    if (!user) localStorage.setItem("chat-name", guestName.trim().slice(0, 30));
    setSending(true); setError("");
    const { data, error: err } = await supabase.from("chat_messages").insert({ body: body.slice(0, 300), display_name: guestName.trim().slice(0, 30), user_id: user ? user.id : null, room_id: roomId }).select("id,user_id,display_name,body,created_at,room_id").single();
    setSending(false);
    if (err) { setError(err.message.includes("chat_banned") ? "تم كتمك من الإدارة ولا يمكنك الكتابة حاليًا." : err.message.includes("slow") ? "انتظر لحظات قبل الرسالة التالية." : "تعذّر الإرسال."); return; }
    setText("");
    if (data && !user) { const ids = [...myIds, data.id].slice(-50); setMyIds(ids); localStorage.setItem("chat-mine", JSON.stringify(ids)); }
    if (data) setMsgs((m) => m.some((x) => x.id === data.id) ? m : [...m, data]);
    void botReply({ data: { body: body.slice(0, 300), author: guestName.trim().slice(0, 30), ...(data ? { messageId: data.id } : {}) } }).catch(() => {});
  }

  async function react(emoji: string) {
    setReactions((x) => ({ ...x, [emoji]: (x[emoji] ?? 0) + 1 }));
    await supabase.rpc("add_chat_reaction", { p_emoji: emoji });
  }
  async function createRoom(e: FormEvent) {
    e.preventDefault(); setCreating(true); setRoomError("");
    const { data, error } = await supabase.rpc("create_chat_room", { p_name: roomName.trim() });
    setCreating(false);
    if (error) { setRoomError(error.code === "23505" ? "اسم الغرفة موجود؛ اختر اسمًا آخر." : error.message.includes("slow") ? "انتظر لحظات قبل إنشاء غرفة أخرى." : "تعذر إنشاء الغرفة؛ حاول مجددًا."); return; }
    const room = Array.isArray(data) ? data[0] : data;
    if (!room) return;
    setRooms((old) => [...old.filter((r) => r.id !== room.id), room]); setRoomId(room.id); setSelectedRoomId(room.id); setCreateOpen(false); setRoomName(""); setSideTab("people");
  }

  return (
    <section dir="rtl" aria-labelledby="live-chat-title" className={`classic-chat mg-chat ${bare ? "classic-chat-bare" : "classic-chat-page"}`}>
      <ChatAppearanceStyle config={appearance} />
      <div className="classic-chat-frame mg-frame">
        <header className="mg-head" dir="ltr">
          <div className="mg-brand"><MessageCircle aria-hidden="true" /><h2 id="live-chat-title">ALMOGHANI <span>CHAT</span></h2><i aria-hidden="true" /><b dir="rtl"><em />متصل</b></div>
          <Link to="/contact" className="mg-head-settings" dir="rtl"><Settings />الإعدادات</Link>
        </header>
        {!entered ? <form className="classic-chat-entry mg-entry" onSubmit={(e) => { e.preventDefault(); const name = guestName.trim().slice(0, 30); if (!name || bannedOut) return; setGuestName(name); localStorage.setItem("chat-name", name); unlockVoiceAudio(); if (!voice) setVoiceOn(true); setEntered(true); }}>
          {voice ? <h2 className="text-center text-lg font-bold">الشات الصوتي</h2> : <Button type="submit" className="mg-btn-primary w-full">الشات الكتابي</Button>}
          <label htmlFor={bare ? "chat-nickname-bare" : "chat-nickname"}>اكتب اسمك المستعار للدخول للدردشة</label>
          <input id={bare ? "chat-nickname-bare" : "chat-nickname"} className="mg-input" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={30} required autoComplete="nickname" />
          {voice ? <Button type="submit" disabled={!guestName.trim()} className="mg-btn-primary w-full"><Volume2 />دخول الشات الصوتي</Button> : <Button type="button" variant="secondary" disabled={!guestName.trim()} className="mg-btn w-full" onClick={() => { const name = guestName.trim().slice(0, 30); if (!name) return; localStorage.setItem("chat-name", name); if (onMobile()) { setGuestName(name); unlockVoiceAudio(); prefetchVoiceTurn(); setVoiceOn(false); setEntered(true); setMode("voice"); } else void navigate({ to: "/voice-chat" }); }}><Volume2 />الشات الصوتي</Button>}
          {bannedOut && <p role="alert" className="text-sm font-bold text-destructive">هذا الاسم محظور من الدردشة.</p>}
        </form> : voice ? <VoiceRoom micsOpen={control.micsOpen} closed={!control.voiceOpen} avatars={siteConfig?.botAvatars ?? {}} guestName={guestName.trim()} /> : <>
        <div className="mg-mode-tabs" role="tablist" aria-label="نوع الشات">
          <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}><MessageCircle />الشات الكتابي</button>
          <button type="button" role="tab" aria-selected={mode === "voice"} onClick={() => { if (mode !== "voice") { setVoiceOn(false); prefetchVoiceTurn(); unlockVoiceAudio(); setMode("voice"); } }}><Volume2 />الشات الصوتي</button>
        </div>
        {mode === "voice" ? <VoiceRoom micsOpen={control.micsOpen} closed={!control.voiceOpen} avatars={siteConfig?.botAvatars ?? {}} guestName={guestName.trim()} /> : <>
        <div className="classic-chat-workspace mg-workspace">
        <aside className="classic-chat-sidebar mg-side" aria-label="الأعضاء والغرف">
          <div className="mg-tabs" role="tablist" aria-label="قائمة الدردشة">
            <button type="button" role="tab" aria-selected={sideTab === "people"} onClick={() => setSideTab("people")}><Users />الأعضاء</button>
            <button type="button" role="tab" aria-selected={sideTab === "room"} onClick={() => setSideTab("room")}><MessageCircle />الغرف</button>
          </div>
          {sideTab === "people" ? <>
            <label className="mg-search"><Search aria-hidden="true" /><input aria-label="بحث عن عضو" placeholder="بحث عن عضو ..." value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} /></label>
            <div className="mg-people">{names.map((name) => <div key={name} className="mg-person"><BotAvatar name={name} path={siteConfig?.botAvatars[name]} fallback={appearance.avatarIcon === "default" ? name.trim().charAt(0) : appearance.avatarIcon} /><em aria-hidden="true" /><button type="button" title={`الرد على ${name}`} onClick={() => { setText(`@${name} `); inputRef.current?.focus(); }}><span>{name}</span></button></div>)}{!names.length && <p className="p-3 text-sm">لا توجد أسماء بعد.</p>}</div>
          </> : <div className="mg-rooms"><b>{activeRoom}</b><select aria-label="اختيار الغرفة" className="mg-input" value={selectedRoomId ?? ""} onChange={(e) => setSelectedRoomId(e.target.value || null)}><option value="">الغرفة العامة</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><Button className="mg-btn-primary" onClick={() => { setRoomId(selectedRoomId); setSideTab("people"); }}>دخول الغرفة</Button><Button className="mg-btn" variant="secondary" onClick={() => { setRoomError(""); setCreateOpen(true); }}><Plus />إنشاء غرفة</Button></div>}
        </aside>
        <div className="classic-chat-main mg-main">
        <div className="mg-roombar"><Users aria-hidden="true" /><b>{activeRoom === "الدردشة العامة" ? "الغرفة العامة" : activeRoom}</b><i aria-hidden="true" /><span>{names.length} متصل الآن</span><em aria-hidden="true" /></div>
        {control.announcement && <p className="mg-announce">📌 {control.announcement}</p>}
        <div ref={listRef} className="classic-chat-messages mg-messages" aria-live="polite" aria-label="رسائل الدردشة">
          <div className="sr-only">{botLine}</div>
          {control.hideMessages ? <p className="py-6 text-center text-sm font-bold">الرسائل مخفية مؤقتًا من الإدارة.</p> : <>
          {msgs.length === 0 && <p className="py-6 text-center text-sm">لا توجد رسائل بعد — كن أول من يكتب.</p>}
          {msgs.map((m) => {
            const mine = user ? m.user_id === user.id : myIds.includes(m.id);
            const name = displayName(m.display_name);
            const isBot = !!(siteConfig?.chatNames.includes(name) || siteConfig?.botNameAliases[m.display_name] || siteConfig?.botAvatars[name]);
            return (
              <div key={m.id} className="mg-msg">
                <BotAvatar name={name} path={siteConfig?.botAvatars[name]} fallback={appearance.avatarIcon === "default" ? (name || "ع").trim().charAt(0) : appearance.avatarIcon} />
                <div className="mg-msg-text">
                  <p className="classic-chat-message-meta mg-name"><b>{name || (mine ? "أنت" : "عضو")}</b>
                    {((mine && user) || isAdmin) && <Button type="button" variant="ghost" size="icon-xs" aria-label="حذف الرسالة" onClick={() => supabase.from("chat_messages").delete().eq("id", m.id).then(() => setMsgs((x) => x.filter((y) => y.id !== m.id)))}><Trash2 /></Button>}
                  </p>
                  <p className="classic-chat-body mg-body">{isBot ? withoutArabicDiacritics(m.body) : m.body}{isBot && <Button type="button" variant="ghost" size="icon-xs" aria-label={`استمع لصوت ${name}`} disabled={voiceLoading === m.id} onClick={() => playVoice(m.id)}>{voiceLoading === m.id ? <Loader2 className="animate-spin" /> : <Volume2 />}</Button>}</p>
                </div>
                <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" })}</time>
              </div>
            );
          })}
          </>}
        </div>
        </div>
        </div>
        {voiceOn && control.voiceOpen && <VoiceRoom compact micsOpen={control.micsOpen} avatars={siteConfig?.botAvatars ?? {}} guestName={guestName.trim()} onClose={() => setVoiceOn(false)} />}
        <form onSubmit={send} className="mg-compose">
          <textarea ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="اكتب رسالتك هنا..." aria-label="اكتب رسالتك" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <div className="mg-tools">
            <button type="button" aria-label="لون الخط" onClick={() => inputRef.current?.focus()}><span className="mg-a">A</span></button>
            <button type="button" aria-label="خط عريض" onClick={() => inputRef.current?.focus()}><b>B</b></button>
            <button type="button" aria-label={voiceOn ? "إيقاف المايك" : "المايك"} aria-pressed={voiceOn} onClick={() => { if (!voiceOn) { prefetchVoiceTurn(); unlockVoiceAudio(); } setVoiceOn((v) => !v); }}>{voiceOn ? <MicOff /> : <Mic />}</button>
            <button type="button" aria-label="الصور" onClick={() => setShowEmoji((v) => !v)}><ImageIcon /></button>
            <button type="button" aria-label="الرموز التعبيرية" aria-expanded={showEmoji} onClick={() => setShowEmoji((v) => !v)}>😊</button>
            <button type="submit" className="mg-send" disabled={sending || !text.trim()} aria-label="إرسال">{sending ? "…" : <>إرسال<Send /></>}</button>
          </div>
          {showEmoji && <div className="mg-emojis">{emojis.map((emoji) => <button key={emoji} type="button" aria-label={`إضافة ${emoji}`} onClick={() => { setText((v) => (v + emoji).slice(0, 300)); inputRef.current?.focus(); }}>{emoji}</button>)}{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => react(emoji)} aria-label={`تفاعل ${emoji}`}>{emoji} {reactions[emoji] ?? 0}</button>)}</div>}
        </form>
        {error && <p role="alert" className="mt-1 px-2 text-sm text-destructive">{error}</p>}
        <nav className="mg-nav" aria-label="تنقل الدردشة">
          <Link to="/" target="_blank" rel="noopener noreferrer"><Home />الرئيسية</Link>
          <button type="button" onClick={() => setSideTab("room")}><Users />الغرف</button>
          <button type="button" onClick={() => setSideTab("people")}><Users />الأعضاء</button>
          <Link to="/contact"><Settings />الإعدادات</Link>
          <button type="button" className="mg-logout" onClick={() => { setEntered(false); setVoiceOn(false); }}><LogOut />خروج</button>
        </nav>
        </>}
        </>}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-sm"><DialogTitle>إنشاء غرفة</DialogTitle><form onSubmit={createRoom} className="grid gap-4"><label htmlFor="new-chat-room">اسم الغرفة</label><input id="new-chat-room" className="member-screen-input" minLength={2} maxLength={40} required value={roomName} onChange={(e) => setRoomName(e.target.value)} autoFocus /><Button type="submit" disabled={creating || roomName.trim().length < 2}><Plus />{creating ? "جارٍ الإنشاء…" : "إنشاء"}</Button>{roomError && <p role="alert" className="text-sm text-destructive">{roomError}</p>}</form></DialogContent></Dialog>
      </div>
    </section>
  );
}
