import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { micSpeak } from "@/lib/mic-voice.functions";
import { FEMALE_VOICE_PROFILES } from "@/lib/voice-config";

// Record speech → transcribe → re-speak with a real AI female voice.
export function RealGirlVoice({ bare = false }: { bare?: boolean }) {
  const speak = useServerFn(micSpeak);
  const [voice, setVoice] = useState(FEMALE_VOICE_PROFILES[0]?.id ?? "female-hessa");
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const [text, setText] = useState("");
  const [clip, setClip] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState<File | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  // iPhone only allows sound started from a tap: unlock one player on the stop tap and reuse it.
  function stopTap() {
    const a = player.current ?? new Audio(); player.current = a;
    a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; void a.play().catch(() => {});
    recRef.current?.stop();
  }

  async function start() {
    setErr(""); setClip(null); setText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const m = new MediaRecorder(stream);
      m.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      m.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void transcribe(new Blob(chunks, { type: (m.mimeType || "audio/mp4").split(";")[0] || "audio/mp4" })); };
      m.start(); recRef.current = m; setState("rec");
      setTimeout(() => m.state === "recording" && m.stop(), 20000);
    } catch { setErr("اسمح للموقع باستخدام المايك من إعدادات سفاري."); }
  }

  async function transcribe(blob: Blob) {
    setState("busy");
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], blob.type.includes("mp4") ? "v.m4a" : "v.webm", { type: blob.type || "audio/mp4" }));
      const r = await fetch("/api/public/voice-listen", { method: "POST", body: fd });
      const j = (await r.json()) as { text?: string };
      const said = (j.text ?? "").trim();
      if (!said) throw new Error("ما سمعت كلام واضح، جرّب مرة ثانية.");
      setText(said);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErr(msg || "صار خطأ، جرّب مرة ثانية.");
    } finally { setState("idle"); }
  }

  async function send() {
    const said = text.trim();
    if (!said) { setErr("اكتب أو سجّل كلامك أولًا."); return; }
    setState("busy"); setErr(""); setClip(null);
    try {
      const { audio } = await speak({ data: { text: said, voice, pin: "2121" } });
      const bin = atob(audio); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      setClip((old) => { if (old) URL.revokeObjectURL(old); return url; });
      setNote(null); void toVoiceNote(bytes).then(setNote);
      const a = player.current ?? new Audio(); player.current = a; a.src = url; void a.play().catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErr(/auth|Unauthorized|مشترك|401/i.test(msg) ? "لازم تسجّل دخول المالك أولًا من لوحة الأصوات." : msg || "صار خطأ، جرّب مرة ثانية.");
    } finally { setState("idle"); }
  }

  // Re-encode to a compressed voice-note file (opus/m4a) so chat apps treat it like a real clip.
  // Re-encode to OGG/Opus so Telegram and WhatsApp show it as a voice note (play button + waveform).
  async function toVoiceNote(bytes: Uint8Array): Promise<File> {
    const wav = new File([bytes as BlobPart], "voice-note.wav", { type: "audio/wav" });
    try {
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(bytes.slice().buffer as ArrayBuffer);
      void ctx.close();
      const pcm = buf.getChannelData(0).slice();
      const blob = await new Promise<Blob>((resolve, reject) => {
        const w = new Worker("/opus/ogg-worker.js");
        w.onmessage = (e) => { w.terminate(); e.data.blob ? resolve(e.data.blob) : reject(new Error(e.data.error)); };
        w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
        w.postMessage({ pcm, sampleRate: buf.sampleRate }, [pcm.buffer]);
      });
      return new File([blob], "voice.ogg", { type: "audio/ogg" });
    } catch { return wav; }
  }

  async function share() {
    const f = note;
    if (!f) return;
    try {
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); return; }
    } catch (e) { if ((e as Error).name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setErr("جهازك ما يدعم المشاركة المباشرة، حمّلنا المقطع — أرسله من الملفات للواتساب أو التليجرام.");
  }

  const body = (
    <>
      <h2 className="text-lg font-bold text-primary">👩 صوت بنت حقيقي</h2>
      <p className="text-sm text-muted-foreground">اضغط سجّل وتكلم (لين 20 ثانية)، ثم وقّف. كلامك ينكتب في المربع، صحّحه إذا تبي، ثم اضغط أرسل ويرجع بصوت البنت.</p>
      <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full rounded-xl border border-border bg-background text-foreground p-2">
        {FEMALE_VOICE_PROFILES.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.label}</option>)}
      </select>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="صحّح كلامك هنا أو اكتبه مباشرة…"
        className="w-full rounded-xl border border-border bg-background text-foreground p-2 text-sm" />
      <div className="flex gap-2">
        <button type="button" disabled={state === "busy"} onClick={state === "rec" ? stopTap : start}
          className={`flex-1 rounded-xl px-5 py-3 font-bold ${state === "rec" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"} disabled:opacity-60`}>
          {state === "rec" ? "⏹ وقّف" : state === "busy" ? "جاري التحويل…" : "⏺ سجّل كلامي"}
        </button>
        <button type="button" disabled={state !== "idle" || !text.trim()} onClick={send}
          className="flex-1 rounded-xl px-5 py-3 font-bold bg-primary text-primary-foreground disabled:opacity-60">
          📤 أرسل
        </button>
      </div>
      {state === "busy" && text && <p className="text-sm text-primary">البنت تجهّز الصوت…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {clip && <div className="space-y-2"><audio src={clip} controls className="w-full" />
        <button type="button" onClick={share} disabled={!note}
          className="w-full rounded-xl px-5 py-3 font-bold bg-primary text-primary-foreground disabled:opacity-60">
          {note ? "📲 أرسل للواتساب أو التليجرام" : "يجهّز المقطع للإرسال…"}
        </button>
        <a href={clip} download="sawt-bint.wav" className="inline-block rounded-xl px-4 py-2 text-sm border border-primary text-primary">حفظ المقطع</a></div>}
    </>
  );
  if (bare) return <div className="space-y-3">{body}</div>;
  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-4 mb-4 space-y-3" aria-label="صوت بنت حقيقي">
      {body}
    </section>
  );
}
