import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hand, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotAvatar } from "@/components/bot-avatar";
import { supabase } from "@/integrations/supabase/client";
import { normalizeVoiceChat } from "@/lib/voice-config";


const TURN_MS = 20000;
type Turn = { name: string; url: string; ms: number } | { disabled: true };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The opening turn is requested as soon as the voice page opens, so sound starts the moment the visitor enters.
let early: Promise<Turn | null>[] = [];
// Clip order is tracked client-side; each prefetch claims the next clip so queued turns never repeat.
let clipCursor = "";
let sayCursor = "";
let chain: Promise<unknown> = Promise.resolve();
export function prefetchVoiceTurn() { if (!early.length) early = [fetchTurn("", "", true), fetchTurn("")]; }

// Phones only allow sound from an element first played during a tap, so one shared element is unlocked on the enter button and reused for every turn.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
let shared: HTMLAudioElement | null = null;
export function unlockVoiceAudio() {
  shared ??= new Audio();
  shared.src = SILENT;
  void shared.play().catch(() => {});
}

function fetchTurn(previous: string, heard = "", fast = false): Promise<Turn | null> {
  const p = chain.then(() => fetchTurnNow(previous, heard, fast));
  chain = p.catch(() => {});
  return p;
}
async function fetchTurnNow(previous: string, heard: string, fast: boolean): Promise<Turn | null> {
  try {
    const res = await fetch("/api/public/bot-voice-turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ previous, heard, fast, lastClip: clipCursor, lastSay: sayCursor }) });
    const clip = res.headers.get("X-Clip-Id"); if (clip) clipCursor = decodeURIComponent(clip);
    const said = res.headers.get("X-Say-Id"); if (said) sayCursor = said;
    if (res.headers.get("X-Voice-Disabled")) return { disabled: true };
    if (!res.ok) return null;
    const name = decodeURIComponent(res.headers.get("X-Bot-Name") ?? "");
    return { name, ms: Number(res.headers.get("X-Turn-Ms")) || TURN_MS, url: URL.createObjectURL(await res.blob()) };
  } catch { return null; }
}

/** Voice-only room: the mic passes in turn (20s each) between bots and visitors who ask for it; nothing spoken is written. */
export function VoiceRoom(props: { avatars: Record<string, string>; guestName: string; compact?: boolean; onClose?: () => void; micsOpen?: boolean; closed?: boolean }) {
  if (props.closed) return <div className="classic-chat-workspace"><p className="p-8 text-center font-bold">الغرفة الصوتية مغلقة حاليًا من الإدارة.</p></div>;
  return <VoiceRoomInner {...props} />;
}
function VoiceRoomInner({ avatars, guestName, compact = false, onClose, micsOpen = true }: { avatars: Record<string, string>; guestName: string; compact?: boolean; onClose?: () => void; micsOpen?: boolean }) {
  const me = guestName || "أنت";
  const [speaker, setSpeaker] = useState("");
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [left, setLeft] = useState(0);
  const [micError, setMicError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  // Mic turn length follows the saved panel setting so the owner controls both bot and mic rounds.
  const turnMsRef = useRef(TURN_MS);
  useEffect(() => {
    let alive = true;
    void supabase.from("site_settings").select("value").eq("key", "voice_chat").maybeSingle().then(({ data }) => {
      if (alive) turnMsRef.current = normalizeVoiceChat(data?.value).turnSeconds * 1000;
    });
    return () => { alive = false; };
  }, []);

  async function raiseHand() {
    if (handRef.current) { handRef.current = false; setHandUp(false); return; }
    setMicError("");
    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      handRef.current = true; setHandUp(true);
    } catch { setMicError("لم يُسمح باستخدام المايك. فعّل الإذن من المتصفح ثم حاول."); }
  }

  async function recordTurn(): Promise<string> {
    const stream = streamRef.current;
    if (!stream) return "";
    const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
    rec.start();
    const started = Date.now();
    const turnMs = turnMsRef.current;
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((turnMs - (Date.now() - started)) / 1000))), 250);
    while (Date.now() - started < turnMs && handRef.current) await sleep(200);
    clearInterval(tick); setLeft(0);
    rec.stop(); await stopped;
    const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
    if (blob.size < 2000) return "";
    const form = new FormData();
    form.append("file", new File([blob], `turn.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`, { type: blob.type.split(";")[0] ?? "audio/webm" }));
    try {
      const res = await fetch("/api/public/voice-listen", { method: "POST", body: form });
      return res.ok ? ((await res.json()) as { text?: string }).text ?? "" : "";
    } catch { return ""; }
  }

  useEffect(() => {
    let alive = true;
    let failures = 0;
    const show = (name: string) => { setSpeaker(name); setSpeakers((s) => [name, ...s.filter((x) => x !== name)].slice(0, 10)); };
    prefetchVoiceTurn();
    let queue = early; early = [];
    const drop = () => { for (const p of queue) void p.then((t) => t && "url" in t && URL.revokeObjectURL(t.url)); queue = []; };
    (async () => {
      let previous = "";
      // Two turns are always prepared ahead, so the next voice starts the instant the current one ends.
      const topUp = () => { while (queue.length < 2) queue.push(fetchTurn(previous)); };
      while (alive) {
        topUp();
        const turn = await queue.shift()!;
        if (!alive) break;
        if (turn && "disabled" in turn) { setDisabled(true); break; }
        if (!turn) {
          failures++;
          await sleep(Math.min(30000, 3000 * 2 ** failures));
          continue;
        }
        failures = 0;
        previous = turn.name;
        if (!handRef.current) topUp();
        show(turn.name); setWaiting(false);
        shared ??= new Audio();
        const audio = shared;
        audio.src = turn.url;
        audioRef.current = audio;
        audio.muted = mutedRef.current;
        await new Promise<void>((done) => {
          const stop = setTimeout(() => { audio.pause(); done(); }, turn.ms);
          audio.onended = () => { clearTimeout(stop); done(); };
          audio.onerror = () => { clearTimeout(stop); done(); };
          audio.play().catch(() => { clearTimeout(stop); done(); });
        });
        URL.revokeObjectURL(turn.url);
        if (!alive) break;
        if (handRef.current) {
          show(me);
          const heard = await recordTurn();
          handRef.current = false; setHandUp(false);
          previous = me;
          setWaiting(true);
          drop();
          queue.push(fetchTurn(me, heard));
          continue;
        }
        setWaiting(true);
      }
    })();
    return () => { alive = false; drop(); handRef.current = false; audioRef.current?.pause(); streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [me]);

  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);
  useEffect(() => { if (!micsOpen) { handRef.current = false; setHandUp(false); } }, [micsOpen]);
  const myTurn = speaker === me && !waiting;
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  if (disabled) return compact ? <p className="p-2 text-center text-xs font-bold">الشات الصوتي متوقف حاليًا.</p> : <div className="classic-chat-workspace"><p className="p-8 text-center font-bold">الشات الصوتي متوقف حاليًا.</p></div>;
  if (compact) return (
    <div className="classic-chat-voice-strip" aria-live="polite" aria-label="الشات الصوتي">
      {speaker ? <BotAvatar name={speaker} path={avatars[speaker]} fallback={speaker.trim().charAt(0) || "؟"} /> : <Loader2 className="size-4 animate-spin" />}
      <p className="flex min-w-0 flex-1 items-center gap-1 text-sm font-bold">
        {waiting ? <><Loader2 className="size-3 animate-spin" />ينتقل المايك…</> : myTurn ? <><span className="animate-pulse">🎤</span>دورك، تكلم الآن {left}ث</> : <><span className="animate-pulse">🎤</span><span className="truncate">{speaker}</span></>}
      </p>
      {myTurn ? <Button size="sm" variant="secondary" onClick={() => { handRef.current = false; }}><MicOff />إنهاء</Button>
        : !micsOpen ? <span className="text-xs font-bold">المايكات مغلقة</span> : <Button size="sm" variant="secondary" onClick={() => void raiseHand()} aria-pressed={handUp}>{handUp ? <><Hand />إلغاء</> : <><Mic />اطلب المايك</>}</Button>}
      <Button size="sm" variant="secondary" onClick={() => setMuted((m) => !m)} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}>{muted ? <VolumeX /> : <Volume2 />}</Button>
      {onClose && <Button size="sm" variant="secondary" onClick={onClose}>إيقاف الصوتي</Button>}
      {micError && <p className="w-full text-xs text-destructive">{micError}</p>}
    </div>
  );
  return (
    <div className="classic-chat-workspace">
        <div className="classic-chat-messages" aria-live="polite" aria-label="المتحدثون في الشات الصوتي">

        {speakers.length === 0 && <p className="flex items-center justify-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin" />يجهز أول متحدث…</p>}
        {speakers.map((name) => {
          const active = name === speaker;
          return (
            <div key={name} className="classic-chat-message">
              <BotAvatar name={name} path={avatars[name]} fallback={name.trim().charAt(0) || "؟"} />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <p className="classic-chat-message-meta"><b>{name} :</b></p>
                {active && <span className={`text-4xl ${waiting ? "opacity-40" : "animate-pulse"}`} role="img" aria-label="معه المايك">🎤</span>}
                {active && name === me && !waiting && <span className="text-sm font-bold">{left}ث</span>}
              </div>
            </div>
          );
        })}
      </div>
      <aside className="classic-chat-sidebar flex flex-col gap-2 p-2" aria-label="تحكم الصوت">
        <p className="text-center text-sm font-bold">الشات الصوتي</p>
        <p className="flex items-center justify-center gap-1 text-xs">{waiting ? <><Loader2 className="size-3 animate-spin" />ينتقل المايك…</> : myTurn ? <><Mic className="size-3" />دورك، تكلم الآن</> : <><Volume2 className="size-3" />يتكلم {speaker}</>}</p>
        {myTurn ? (
          <Button className="classic-chat-control" variant="secondary" onClick={() => { handRef.current = false; }}><MicOff />إنهاء دوري</Button>
        ) : !micsOpen ? <p className="text-center text-xs font-bold">المايكات مغلقة من الإدارة</p> : (
          <Button className="classic-chat-control" variant="secondary" onClick={() => void raiseHand()} aria-pressed={handUp}>{handUp ? <><Hand />بانتظار دورك (إلغاء)</> : <><Mic />اطلب المايك</>}</Button>
        )}
        {micError && <p className="text-xs text-destructive">{micError}</p>}
        <Button className="classic-chat-control" variant="secondary" onClick={() => setMuted((m) => !m)}>{muted ? <><VolumeX />تشغيل الصوت</> : <><Volume2 />كتم الصوت</>}</Button>
        <Button asChild className="classic-chat-exit"><Link to="/">خروج</Link></Button>
      </aside>
    </div>
  );
}
