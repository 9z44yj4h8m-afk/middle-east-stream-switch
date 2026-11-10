import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { micSpeak } from "@/lib/mic-voice.functions";
import { FEMALE_VOICE_PROFILES } from "@/lib/voice-config";

// Record speech → transcribe → re-speak with a real AI female voice.
export function RealGirlVoice() {
  const speak = useServerFn(micSpeak);
  const [voice, setVoice] = useState(FEMALE_VOICE_PROFILES[0]?.id ?? "female-hessa");
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const [text, setText] = useState("");
  const [clip, setClip] = useState<string | null>(null);
  const [err, setErr] = useState("");
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
      m.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void convert(new Blob(chunks, { type: (m.mimeType || "audio/mp4").split(";")[0] || "audio/mp4" })); };
      m.start(); recRef.current = m; setState("rec");
      setTimeout(() => m.state === "recording" && m.stop(), 20000);
    } catch { setErr("اسمح للموقع باستخدام المايك من إعدادات سفاري."); }
  }

  async function convert(blob: Blob) {
    setState("busy");
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], blob.type.includes("mp4") ? "v.m4a" : "v.webm", { type: blob.type || "audio/mp4" }));
      const r = await fetch("/api/public/voice-listen", { method: "POST", body: fd });
      const j = (await r.json()) as { text?: string };
      const said = (j.text ?? "").trim();
      if (!said) throw new Error("ما سمعت كلام واضح، جرّب مرة ثانية.");
      setText(said);
      const { audio } = await speak({ data: { text: said, voice, pin: "2121" } });
      const bin = atob(audio); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      setClip((old) => { if (old) URL.revokeObjectURL(old); return url; });
      const a = player.current ?? new Audio(); player.current = a; a.src = url; void a.play().catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErr(/auth|Unauthorized|مشترك|401/i.test(msg) ? "لازم تسجّل دخول المالك أولًا من لوحة الأصوات." : msg || "صار خطأ، جرّب مرة ثانية.");
    } finally { setState("idle"); }
  }

  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-4 mb-4 space-y-3" aria-label="صوت بنت حقيقي">
      <h2 className="text-lg font-bold text-primary">👩 صوت بنت حقيقي</h2>
      <p className="text-sm text-muted-foreground">اضغط سجّل وتكلم (لين 20 ثانية)، ثم وقّف. كلامك يرجع بصوت بنت حقيقي بعد ثواني.</p>
      <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full rounded-xl border border-border bg-background text-foreground p-2">
        {FEMALE_VOICE_PROFILES.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.label}</option>)}
      </select>
      <button type="button" disabled={state === "busy"} onClick={state === "rec" ? stopTap : start}
        className={`w-full rounded-xl px-5 py-3 font-bold ${state === "rec" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"} disabled:opacity-60`}>
        {state === "rec" ? "⏹ وقّف وحوّل" : state === "busy" ? "جاري التحويل…" : "⏺ سجّل كلامي"}
      </button>
      {text && <p className="text-sm text-foreground">قلت: «{text}»</p>}
      {state === "busy" && text && <p className="text-sm text-primary">البنت تجهّز الصوت…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {clip && <div className="space-y-2"><audio src={clip} controls className="w-full" />
        <a href={clip} download="sawt-bint.wav" className="inline-block rounded-xl px-4 py-2 text-sm border border-primary text-primary">حفظ المقطع</a></div>}
    </section>
  );
}
