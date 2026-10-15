import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Download, MessageCircle, Music2, Play, Plus, Save, Send, Trash2, Upload, UserRound, AudioLines, Mic, Radio, Settings2, Home, ListMusic, Square, SquareStop, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FEMALE_VOICE_PROFILES, FEMALE_VOICE_CATEGORIES, MELODIES, RHYTHMS, VOICE_LIST, defaultVoiceChat, normalizeVoiceChat, voiceCategory, type VoiceChatConfig } from "@/lib/voice-config";
import { defaultChatBots, type ChatBotsConfig } from "@/lib/chat-bots.functions";
import { previewVoice } from "@/lib/voice-preview.functions";
import { WHATSAPP_URL } from "@/lib/subscription";
import { defaultVoicePanel, normalizeVoicePanel, type VoicePanelConfig } from "@/lib/voice-panel";
import { canMakeVoiceNote, toOggOpus } from "@/lib/ogg-opus";
import { applyVoiceFx, bytesToBase64, loadHistory, saveHistory, ECHO_OPTIONS, BED_OPTIONS, type EchoMode, type BedMode, type SavedClip } from "@/lib/voice-fx";

import voiceNeonHeader from "@/assets/voice-anime-header-v2.jpg.asset.json";
import voiceAvatar from "@/assets/voice-anime-avatar-v2.jpg.asset.json";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const field = "h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none";

// ---- مغيّر الصوت المباشر: خطّا تأخير متداخلان يعدّلان طبقة الصوت لحظيًا (يعمل على الجوال) ----
const JUNGLE_BUFFER_TIME = 0.1;
const JUNGLE_FADE_TIME = 0.05;
const JUNGLE_DELAY_TIME = 0.1;

function jungleDelayBuffer(ctx: BaseAudioContext, shiftUp: boolean) {
  const length1 = Math.floor(JUNGLE_BUFFER_TIME * ctx.sampleRate);
  const length2 = Math.floor((JUNGLE_BUFFER_TIME - 2 * JUNGLE_FADE_TIME) * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length1 + length2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length1; i++) data[i] = shiftUp ? (length1 - i) / length1 : i / length1;
  return buffer;
}

function jungleFadeBuffer(ctx: BaseAudioContext) {
  const length1 = Math.floor(JUNGLE_BUFFER_TIME * ctx.sampleRate);
  const length2 = Math.floor((JUNGLE_BUFFER_TIME - 2 * JUNGLE_FADE_TIME) * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length1 + length2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const fadeLength = Math.max(1, Math.floor(JUNGLE_FADE_TIME * ctx.sampleRate));
  const fadeIndex2 = length1 - fadeLength;
  for (let i = 0; i < length1; i++) {
    data[i] = i < fadeLength ? Math.sqrt(i / fadeLength) : i >= fadeIndex2 ? Math.sqrt(1 - (i - fadeIndex2) / fadeLength) : 1;
  }
  return buffer;
}

class VoicePitchJungle {
  readonly input: GainNode;
  readonly output: GainNode;
  private modGain1: GainNode;
  private modGain2: GainNode;
  private downGains: GainNode[];
  private upGains: GainNode[];

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    const shiftDown = jungleDelayBuffer(ctx, false);
    const shiftUp = jungleDelayBuffer(ctx, true);
    const mods = [ctx.createBufferSource(), ctx.createBufferSource(), ctx.createBufferSource(), ctx.createBufferSource()];
    for (const mod of mods) { mod.buffer = shiftDown; mod.loop = true; }
    mods[2]!.buffer = shiftUp; mods[3]!.buffer = shiftUp;
    const downGains = [ctx.createGain(), ctx.createGain()];
    const upGains = [ctx.createGain(), ctx.createGain()];
    upGains[0]!.gain.value = 0; upGains[1]!.gain.value = 0;
    this.downGains = downGains; this.upGains = upGains;
    this.modGain1 = ctx.createGain(); this.modGain2 = ctx.createGain();
    const delay1 = ctx.createDelay(1); const delay2 = ctx.createDelay(1);
    mods[0]!.connect(downGains[0]!); mods[1]!.connect(downGains[1]!);
    mods[2]!.connect(upGains[0]!); mods[3]!.connect(upGains[1]!);
    downGains[0]!.connect(this.modGain1); downGains[1]!.connect(this.modGain2);
    upGains[0]!.connect(this.modGain1); upGains[1]!.connect(this.modGain2);
    this.modGain1.connect(delay1.delayTime);
    this.modGain2.connect(delay2.delayTime);
    const fadeBuffer = jungleFadeBuffer(ctx);
    const fades = [ctx.createBufferSource(), ctx.createBufferSource()];
    fades[0]!.buffer = fadeBuffer; fades[1]!.buffer = fadeBuffer;
    fades[0]!.loop = true; fades[1]!.loop = true;
    const mix1 = ctx.createGain(); const mix2 = ctx.createGain();
    mix1.gain.value = 0; mix2.gain.value = 0;
    fades[0]!.connect(mix1.gain); fades[1]!.connect(mix2.gain);
    this.input.connect(delay1); this.input.connect(delay2);
    delay1.connect(mix1); delay2.connect(mix2);
    mix1.connect(this.output); mix2.connect(this.output);
    const t = ctx.currentTime + 0.05;
    const t2 = t + JUNGLE_BUFFER_TIME - JUNGLE_FADE_TIME;
    mods[0]!.start(t); mods[1]!.start(t2); mods[2]!.start(t); mods[3]!.start(t2);
    fades[0]!.start(t); fades[1]!.start(t2);
  }

  setPitchRatio(ratio: number) {
    const up = ratio >= 1;
    for (const g of this.downGains) g.gain.value = up ? 0 : 1;
    for (const g of this.upGains) g.gain.value = up ? 1 : 0;
    const depth = JUNGLE_DELAY_TIME * Math.abs(ratio - 1);
    this.modGain1.gain.setTargetAtTime(0.5 * depth, 0, 0.01);
    this.modGain2.gain.setTargetAtTime(0.5 * depth, 0, 0.01);
  }
}

export function SayNowForm({ locked = false }: { locked?: boolean } = {}) {
  const [subOpen, setSubOpen] = useState(false);
  const [cfg, setCfg] = useState<VoiceChatConfig>(defaultVoiceChat);
  const [bots, setBots] = useState<string[]>(defaultChatBots.bots.map((b) => b.name));
  const [note, setNote] = useState("");
  const [testing, setTesting] = useState(false);
  const [sayBot, setSayBot] = useState("");
  const [sayText, setSayText] = useState("");
  const [sayVoice, setSayVoice] = useState("Leda");
  const [sing, setSing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [melody, setMelody] = useState("najdi");
  const [rhythm, setRhythm] = useState("slow");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const previewVoiceFn = useServerFn(previewVoice);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [panel, setPanel] = useState<VoicePanelConfig>(defaultVoicePanel);
  const [quick, setQuick] = useState(""); // voice id currently quick-previewing from its card
  const PANEL_STORE = "almoghani-voice-panel";
  // Preview audio plays once; the replay button starts the same clip again on demand.
  const clipRef = useRef<HTMLAudioElement | null>(null);
  const [clipSrc, setClipSrc] = useState("");
  const [playing, setPlaying] = useState(false);
  function playClip(src: string) {
    clipRef.current?.pause();
    const player = new Audio(src);
    clipRef.current = player;
    setClipSrc(src);
    setPlaying(true);
    player.onpause = () => { if (clipRef.current === player) setPlaying(false); };
    return player.play();
  }
  function stopClip() {
    clipRef.current?.pause();
    clipRef.current = null;
    setPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  // Replay: the saved-clip player restarts from zero, otherwise the last generated preview plays again.
  function replayClip() {
    if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play(); setPlaying(true); return; }
    if (clipSrc) void playClip(clipSrc);
  }
  useEffect(() => () => { clipRef.current?.pause(); }, []);
  const [echo, setEcho] = useState<EchoMode>("none");
  const [bed, setBed] = useState<BedMode>("none");
  const [history, setHistory] = useState<SavedClip[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);
  function useSaved(c: SavedClip) {
    const bytes = Uint8Array.from(atob(c.data), (ch) => ch.charCodeAt(0));
    setAudioFile(new File([bytes], `${c.name}.wav`, { type: "audio/wav" }));
    void playClip(`data:audio/wav;base64,${c.data}`);
    setNote(`مقطع محفوظ: ${c.name} — تقدر ترسله الحين بدون رصيد ✓`);
  }
  // Native player for a saved/recorded clip, so the stop button can silence it too.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  function stopAll() {
    stopClip();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlaying(false);
  }

  // Quick play straight from a voice card: speaks a short sample with that voice only.
  async function quickTest(voiceId: string) {
    if (locked) { setSubOpen(true); return; }
    if (testing || quick) return;
    setQuick(voiceId); setNote("");
    const profile = FEMALE_VOICE_PROFILES.find((v) => v.id === voiceId);
    const text = `هلا والله، أنا ${profile?.name ?? "بنت"}، هذي تجربة صوتي`;
    try {
      const { audio } = await previewVoiceFn({ data: { text, voice: voiceId, sing: false, melody: "najdi", rhythm: "slow" } });
      await playClip(`data:audio/wav;base64,${audio}`);
      setNote(`هذا صوت ${profile?.name} ✓`);
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ar-SA"; u.pitch = 1.4; u.rate = 0.95;
        const ar = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ar"));
        if (ar) u.voice = ar;
        window.speechSynthesis.speak(u);
        setNote("تعذّر الصوت السحابي؛ اشتغل قارئ جهازك المجاني.");
      } else setNote("تعذّر تجربة الصوت.");
    } finally { setQuick(""); }
  }

  // Remember the owner's panel choices on this device so it reopens the same way.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PANEL_STORE) ?? "{}") as { bot?: string; voice?: string; sing?: boolean; melody?: string; rhythm?: string };
      if (saved.voice && VOICE_LIST.some((v) => v.id === saved.voice)) setSayVoice(saved.voice);
      if (saved.bot) setSayBot(saved.bot);
      if (saved.sing === true) {
        setSing(true);
        if (saved.melody && MELODIES.some((m) => m.id === saved.melody)) setMelody(saved.melody);
        if (saved.rhythm && RHYTHMS.some((r) => r.id === saved.rhythm)) setRhythm(saved.rhythm);
      }
    } catch { /* first visit or blocked storage */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(PANEL_STORE, JSON.stringify({ bot: sayBot, voice: sayVoice, sing, melody, rhythm })); } catch { /* storage unavailable */ }
  }, [sayBot, sayVoice, sing, melody, rhythm]);
  function micError(e: unknown) {
    const n = (e as { name?: string })?.name;
    if (typeof window !== "undefined" && window.self !== window.top) return "المايك ما يشتغل داخل المعاينة؛ افتح almoghani.net/22 مباشرة في سفاري أو كروم";
    if (!navigator.mediaDevices?.getUserMedia) return "المتصفح هذا ما يدعم المايك؛ افتح الصفحة في سفاري أو كروم";
    const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    if (standalone) return "المايك داخل التطبيق المثبّت على الشاشة الرئيسية محدود؛ افتح الصفحة في سفاري مباشرة: almoghani.net/22";
    if (n === "NotAllowedError") return "المايك مقفل: في سفاري اضغط أيقونة AA بجانب العنوان ← إعدادات الموقع ← الميكروفون ← سماح، ثم حدّث الصفحة (أو إعدادات الجوال ← التطبيقات ← سفاري ← الميكروفون ← سماح)";
    if (n === "NotReadableError" || n === "TrackStartError") return "المايك مشغول ببرنامج ثاني (مكالمة أو سناب أو واتساب). أغلق البرامج اللي تستخدم المايك ثم جرّب مرة ثانية";
    if (n === "NotFoundError" || n === "DevicesNotFoundError") return "ما لقينا مايك في الجهاز";
    if (n === "AbortError") return "انقطع تشغيل المايك لحظة الفتح؛ اضغط الزر مرة ثانية";
    if (n === "OverconstrainedError") return "إعدادات الصوت ما ناسبت مايك الجهاز؛ جرّب مرة ثانية";
    return "ما قدرنا نفتح المايك: اسمح للمايك من إعدادات المتصفح، أغلق أي برنامج يستخدم المايك، ثم حدّث الصفحة";
  }
  async function toggleRecord() {
    if (recorder) { recorder.stop(); return; }
    stopClip(); // keep the preview out of the recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File(chunks, `almoghani-record-${Date.now()}.${ext}`, { type: type.split(";")[0] || "audio/webm" });
        setAudioFile(file);
        setRecorder(null); setRecording(false); setNote("جارٍ كتابة كلامك…");
        // Speech is transcribed into the test text box so the owner can try it with any voice.
        try {
          const form = new FormData();
          form.append("file", file, file.name);
          const res = await fetch("/api/public/voice-listen", { method: "POST", body: form });
          const heard = res.ok ? ((await res.json()) as { text?: string }).text?.trim() ?? "" : "";
          if (heard) { setSayText(heard); setNote("تم كتابة كلامك في مربع التجربة ✓"); }
          else setNote("تم التسجيل، لكن ما قدرنا نكتب الكلام؛ تكلم بوضوح وحاول مجددًا.");
        } catch { setNote("تم التسجيل، لكن تعذّرت كتابة الكلام."); }
      };
      rec.start(); setRecorder(rec); setRecording(true); setNote("جارٍ التسجيل… اضغط إيقاف التسجيل");
    } catch (e) { setNote(micError(e)); }
  }
  // ---- مغيّر الصوت المباشر ----
  const changerCtxRef = useRef<AudioContext | null>(null);
  const changerJungleRef = useRef<VoicePitchJungle | null>(null);
  const changerStreamRef = useRef<MediaStream | null>(null);
  const changerDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const changerRecRef = useRef<MediaRecorder | null>(null);
  const [changerOn, setChangerOn] = useState(false);
  const [changerRatio, setChangerRatio] = useState(1.5);
  const [changerRec, setChangerRec] = useState(false);

  async function startChanger() {
    // iPhone only allows sound from an AudioContext created during the tap, before any await.
    const ctx = new AudioContext();
    void ctx.resume();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      await ctx.resume();
      const jungle = new VoicePitchJungle(ctx);
      jungle.setPitchRatio(changerRatio);
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(stream).connect(jungle.input);
      jungle.output.connect(ctx.destination);
      jungle.output.connect(dest);
      changerCtxRef.current = ctx; changerJungleRef.current = jungle;
      changerStreamRef.current = stream; changerDestRef.current = dest;
      setChangerOn(true);
      setNote("المغيّر شغّال الآن 🎙️ استخدم سماعات 🎧 حتى لا يرجع صوتك من المكبر");
    } catch (e) { void ctx.close().catch(() => {}); setNote(micError(e)); }
  }

  function stopChanger() {
    if (changerRecRef.current?.state === "recording") changerRecRef.current.stop();
    changerRecRef.current = null;
    changerStreamRef.current?.getTracks().forEach((t) => t.stop());
    void changerCtxRef.current?.close().catch(() => {});
    changerCtxRef.current = null; changerJungleRef.current = null;
    changerStreamRef.current = null; changerDestRef.current = null;
    setChangerOn(false); setChangerRec(false);
  }

  function setChangerVoice(ratio: number) {
    setChangerRatio(ratio);
    changerJungleRef.current?.setPitchRatio(ratio);
  }

  function toggleChangerRecord() {
    const dest = changerDestRef.current;
    if (!dest) return;
    const rec = changerRecRef.current;
    if (rec) { rec.stop(); return; }
    const chunks: Blob[] = [];
    const next = new MediaRecorder(dest.stream);
    next.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    next.onstop = () => {
      const type = next.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      setAudioFile(new File(chunks, `almoghani-changer-${Date.now()}.${ext}`, { type }));
      changerRecRef.current = null; setChangerRec(false);
      setNote("تم تسجيل الصوت المغيّر ✓ تقدر تحفظه في جوالك أو ترسله لسناب");
    };
    next.start(); changerRecRef.current = next; setChangerRec(true);
  }

  useEffect(() => () => {
    changerStreamRef.current?.getTracks().forEach((t) => t.stop());
    void changerCtxRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!audioFile) { setAudioUrl(""); return; }
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  async function downloadVoice() {
    if (!audioFile) return;
    try {
      if (navigator.canShare?.({ files: [audioFile] })) {
        await navigator.share({ files: [audioFile], title: "صوت المغني" });
        return;
      }
      const url = URL.createObjectURL(audioFile);
      const link = document.createElement("a");
      link.href = url; link.download = audioFile.name;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNote("تم طلب تنزيل المقطع الصوتي ✓");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّر تنزيل الصوت؛ حاول مجددًا.");
    }
  }

  async function sendToWhatsapp() {
    if (!audioFile) return;
    try {
      if (navigator.canShare?.({ files: [audioFile] })) {
        await navigator.share({ files: [audioFile] });
        setNote("اختر WhatsApp ثم الشخص؛ يوصل المقطع كملف صوتي.");
        return;
      }
      setNote("جهازك لا يدعم المشاركة المباشرة؛ احفظ الصوت ثم أرفقه من واتساب.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّر الإرسال؛ حاول مجددًا.");
    }
  }

  async function sendToSnapchat() {
    if (!audioFile) return;
    try {
      const file = audioFile;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        setNote("اختر Snapchat؛ قد يعرض المقطع كرابط وليس رسالة صوتية.");
        return;
      }
      setNote("جهازك لا يدعم المشاركة المباشرة؛ احفظ الصوت ثم أرسله من سناب شات.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّر الإرسال؛ حاول مجددًا.");
    }
  }

  async function sendToTelegram() {
    if (!audioFile) return;
    try {
      let file = audioFile;
      // Telegram shows Ogg/Opus as a voice message with a waveform instead of a named file.
      if (canMakeVoiceNote()) { try { file = await toOggOpus(audioFile, audioFile.name.replace(/\.[^.]+$/, "")); } catch { file = audioFile; } }
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        setNote("اختر Telegram ثم الشخص؛ يوصل المقطع كرسالة صوتية تُشغّل داخل الشات.");
        return;
      }
      setNote("جهازك لا يدعم المشاركة المباشرة؛ احفظ الصوت ثم أرفقه من تيليجرام.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّر الإرسال؛ حاول مجددًا.");
    }
  }

  async function sendToTarab() {
    if (!audioFile) return;
    setNote("اختر طرب من قائمة المشاركة إن ظهر؛ وإلا احفظ الصوت في الملفات ثم استورده من طرب عبر وسائط الجهاز.");
    try {
      if (navigator.canShare?.({ files: [audioFile] })) {
        await navigator.share({ files: [audioFile] });
        return;
      }
      setNote("المشاركة المباشرة غير متاحة؛ احفظ الصوت في الملفات ثم افتح طرب واختر وسائط الجهاز لاستيراده.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّرت المشاركة؛ احفظ الصوت في الملفات ثم استورده من طرب عبر وسائط الجهاز.");
    }
  }

  async function sendToSignal() {
    if (!audioFile) return;
    try {
      if (navigator.canShare?.({ files: [audioFile] })) {
        await navigator.share({ files: [audioFile] });
        setNote("اختر Signal ثم الشخص؛ يوصل المقطع كمرفق صوتي يُشغّل داخل المحادثة.");
        return;
      }
      setNote("جهازك لا يدعم المشاركة المباشرة؛ احفظ الصوت ثم أرفقه من سيجنال.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNote("تعذّر الإرسال؛ حاول مجددًا.");
    }
  }


  // Voice changer: transcribes the owner's recording, then re-speaks the words with the chosen girl voice.
  async function convertMyVoice() {
    if (!audioFile || testing) return;
    setTesting(true); setNote("جارٍ تحويل صوتك…");
    let heard = "";
    try {
      const form = new FormData();
      form.append("file", audioFile, audioFile.name);
      const res = await fetch("/api/public/voice-listen", { method: "POST", body: form });
      heard = res.ok ? ((await res.json()) as { text?: string }).text?.trim() ?? "" : "";
    } catch { /* handled below */ }
    setTesting(false);
    if (!heard) { setNote("ما قدرنا نفهم التسجيل؛ سجّل بصوت أوضح وحاول مجددًا."); return; }
    setSayText(heard);
    await testVoice(heard);
  }

  async function testVoice(spoken?: string) {
    if (locked) { setSubOpen(true); return; }
    if (testing) return;
    const name = sayBot || bots[0] || "";
    setTesting(true); setNote(""); setAudioFile(null);
    const text = (typeof spoken === "string" ? spoken : sayText).trim() || "هلا والله، هذي تجربة للصوت من لوحة التحكم";
    const selected = sayVoice || cfg.botVoices[name];
    const customVoice = panel.custom.find((c) => c.id === selected);
    const voiceId = customVoice?.providerId ?? VOICE_LIST.find((v) => v.id === selected && v.female)?.id ?? "Leda";
    try {
      const { audio } = await previewVoiceFn({ data: { text, voice: voiceId, sing, melody, rhythm, delivery: customVoice?.delivery || undefined } });
      let bytes: Uint8Array<ArrayBuffer> = Uint8Array.from(atob(audio), (char) => char.charCodeAt(0));
      let b64 = audio;
      if (echo !== "none" || bed !== "none") {
        try { bytes = await applyVoiceFx(bytes, echo, bed); b64 = bytesToBase64(bytes); } catch { /* keep the clean voice */ }
      }
      const voiceName = (customVoice?.name || VOICE_LIST.find((v) => v.id === selected)?.name || "صوت المغني").replace(/[\\/:*?"<>|]/g, "").trim() || "صوت المغني";
      setAudioFile(new File([bytes], `${voiceName}.wav`, { type: "audio/wav" }));
      await playClip(`data:audio/wav;base64,${b64}`);
      setHistory((h) => saveHistory([{ id: `${Date.now()}`, name: voiceName, text, at: Date.now(), data: b64 }, ...h]));
      setNote("هذا هو الصوت اللي اخترته ✓");
    } catch {
      // Free on-device fallback when the cloud voice is unavailable (e.g. no AI credits).
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ar-SA";
        const ar = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("ar"));
        if (ar) u.voice = ar;
        u.pitch = 1.4;
        u.rate = 0.95;
        synth.speak(u);
        setNote("تعذّر الصوت السحابي؛ اشتغل قارئ جهازك المجاني، ولا يمكن حفظ صوته كملف.");
      } else setNote("تعذّر تجريب الصوت.");
    }
    finally { setTesting(false); }
  }

  useEffect(() => {
    let alive = true;
    void supabase.from("site_settings").select("key,value").in("key", ["voice_chat", "chat_bots", "voice_panel"]).then(({ data }) => {
      if (!alive) return;
      for (const row of data ?? []) {
        if (row.key === "voice_chat") setCfg(normalizeVoiceChat(row.value));
        if (row.key === "voice_panel") setPanel(normalizeVoicePanel(row.value));
        if (row.key === "chat_bots") { const b = (row.value as Partial<ChatBotsConfig>)?.bots; if (b?.length) setBots(b.map((x) => x.name)); }
      }
    });
    return () => { alive = false; };
  }, []);

  const pc = panel.colors;
  return <section aria-label="تجريب أصوات البنات" className="voice-studio-panel">
    <Dialog open={subOpen} onOpenChange={setSubOpen}><DialogContent dir="rtl" className="text-center">
      <DialogTitle className="text-center text-2xl font-black">اشترك في ALMOGHANI VOICE</DialogTitle>
      <DialogDescription className="text-center">تشغيل الأصوات متاح للمشتركين فقط. تواصل معنا على واتساب 0557073007 لتفعيل اشتراكك.</DialogDescription>
      <Button asChild className="voice-studio-contact"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircle />اشترك الآن</a></Button>
    </DialogContent></Dialog>
    {pc.enabled && <style>{`.voice-studio-page{background:${pc.bg}!important}.voice-studio-panel,.voice-studio-panel label,.voice-studio-panel span{color:${pc.text}}.voice-studio-panel .voice-studio-select,.voice-studio-panel textarea,.voice-studio-preview,.voice-studio-sing,.voice-studio-actions button{border-color:${pc.accent}!important}.voice-studio-panel .voice-studio-save{background:${pc.gold}!important;border-color:${pc.gold}!important}`}</style>}
    {!panel.showHeader && <h2 className="font-display text-2xl font-black text-center">ALMOGHANI VOICE</h2>}
    {panel.showHeader && <div className="voice-neon-hero" id="voice-home">
      <img src={voiceNeonHeader.url} alt="ALMOGHANI VOICE — غير صوتك، سجل صوتك وغيره باحتراف" />
      <Button className="voice-neon-settings" variant="ghost" size="icon" aria-label="إعدادات الصوت" title="إعدادات الصوت" onClick={() => setSettingsOpen(true)}><Settings2 /></Button>
      <Button className="voice-neon-account" variant="ghost" size="icon" aria-label="اختيار البوت" title="اختيار البوت" onClick={() => setSettingsOpen(true)}><UserRound /></Button>
      <h1 className="sr-only">ALMOGHANI VOICE — غير صوتك</h1>
    </div>}
    <label className="voice-neon-text voice-studio-field">
      <span><Button variant="ghost" size="icon" disabled={testing} onClick={toggleRecord} aria-label={recording ? "إيقاف التسجيل الآن" : "ابدأ التسجيل"} title={recording ? "إيقاف التسجيل" : "ابدأ التسجيل"} className={recording ? "is-recording" : ""}>{recording ? <Square /> : <Mic />}</Button>{panel.texts.textLabel}</span>
      <textarea id="voice-text" aria-label="الكلام" maxLength={400} placeholder={panel.texts.placeholder} value={sayText} onChange={(e) => { setSayText(e.target.value); setAudioFile(null); }} />
      <small className="voice-text-count" dir="ltr">{sayText.length}/400</small>
    </label>
    <div className="voice-studio-form" id="voice-settings">
      <div className="voice-neon-choice">
      <label className="voice-studio-field"><span><Mic />{panel.texts.voiceLabel}</span><div className="voice-studio-select"><img className="voice-choice-avatar" src={voiceAvatar.url} alt="" /><select aria-label="صوت هذه الجملة" value={sayVoice} disabled={testing} onChange={(e) => { setSayVoice(e.target.value); setAudioFile(null); }}>
        <option value="">صوت البوت المحفوظ</option>
        {FEMALE_VOICE_CATEGORIES.map((cat) => {
          const list = FEMALE_VOICE_PROFILES.filter((v) => voiceCategory(v.id) === cat && !panel.hidden.includes(v.id));
          return list.length ? <optgroup key={cat} label={cat}>{list.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.label}</option>)}</optgroup> : null;
        })}
        {panel.custom.length > 0 && <optgroup label="أصواتي المضافة">{panel.custom.map((v) => <option key={v.id} value={v.id}>{v.name}{v.label ? ` · ${v.label}` : ""}</option>)}</optgroup>}
      </select><ChevronDown aria-hidden="true" /></div></label>
      <label className="voice-studio-sing"><Music2 aria-hidden="true" /><span>{panel.texts.singLabel}</span><Switch dir="ltr" checked={sing} onCheckedChange={(value) => { setSing(value); setAudioFile(null); }} aria-label="خلّها تغني الكلام بدل ما تقوله" /></label>
      </div>
      {sing && <div className="voice-neon-melody grid gap-2 sm:grid-cols-2">
        <select className={field} aria-label="اللحن" value={melody} onChange={(e) => { setMelody(e.target.value); setAudioFile(null); }}>{MELODIES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        <select className={field} aria-label="الإيقاع والرقصة" value={rhythm} onChange={(e) => { setRhythm(e.target.value); setAudioFile(null); }}>{RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
      </div>}
      <div className="voice-neon-fx grid grid-cols-2 gap-2">
        <select className={field} aria-label="مؤثر الصدى" value={echo} onChange={(e) => { setEcho(e.target.value as EchoMode); setAudioFile(null); }}>{ECHO_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        <select className={field} aria-label="لحن الخلفية" value={bed} onChange={(e) => { setBed(e.target.value as BedMode); setAudioFile(null); }}>{BED_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      </div>
      <div className="voice-studio-preview" id="voice-recordings">{audioUrl ? <audio ref={audioRef} controls src={audioUrl} aria-label="معاينة الصوت المولد" /> : <><Button size="icon" variant="outline" aria-label="تشغيل تجربة الصوت" disabled={testing} onClick={() => void testVoice()} className="voice-studio-play"><Play /></Button><span className="voice-studio-status" role="status">{testing ? "جارٍ التجريب…" : playing ? "الصوت شغّال…" : clipSrc ? "انتهى الصوت — اضغط إعادة" : "جاهز للتجربة"}</span><div className="voice-studio-wave" aria-hidden="true">{Array.from({ length: 43 }, (_, i) => <i key={i} />)}</div></>}<Button size="icon" variant="outline" aria-label="إعادة الصوت" title="إعادة الصوت" disabled={!clipSrc && !audioUrl} onClick={replayClip} className="voice-studio-replay"><RotateCcw /></Button><Button size="icon" variant="outline" aria-label="إيقاف الصوت" title="إيقاف الصوت" disabled={!playing && !audioUrl} onClick={stopAll} className="voice-studio-stop"><SquareStop /></Button></div>
      <div className="voice-studio-actions">
        <Button type="button" variant="outline" disabled={testing} onClick={() => void testVoice()} className="voice-studio-test"><Play />{testing ? "جارٍ التجريب…" : panel.texts.testBtn}</Button>
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={downloadVoice} className="voice-studio-download"><Download />{panel.texts.downloadBtn}</Button>
      </div>
      <div className="voice-studio-actions voice-studio-send" aria-label="إرسال المقطع الصوتي">
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={sendToWhatsapp} className="voice-studio-download"><Send />إرسال للواتساب</Button>
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={sendToTelegram} className="voice-studio-test"><Send />إرسال لتيليجرام</Button>
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={sendToSignal} className="voice-studio-download"><Send />إرسال لسيجنال</Button>
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={sendToSnapchat} className="voice-studio-test"><Send />إرسال للسناب</Button>
        <Button type="button" variant="outline" disabled={!audioFile || testing} onClick={sendToTarab} className="voice-studio-download"><Music2 />إرسال لطرب</Button>
      </div>
      {history.length > 0 && <div className="voice-studio-history grid gap-2 rounded-xl border border-border p-3" aria-label="المقاطع الأخيرة">
        <div className="flex items-center justify-between text-sm font-bold"><span>المقاطع الأخيرة (بدون رصيد)</span><Button type="button" size="sm" variant="ghost" onClick={() => setHistory(saveHistory([]))}><Trash2 />مسح</Button></div>
        {history.map((c) => <div key={c.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-background/40 p-2">
          <Button type="button" size="icon" variant="outline" aria-label={`تشغيل ${c.name}`} onClick={() => useSaved(c)}><Play /></Button>
          <div className="min-w-0 flex-1 text-xs"><b className="block">{c.name}</b><span className="block truncate opacity-75">{c.text}</span></div>
          <Button type="button" size="icon" variant="ghost" aria-label={`حذف ${c.name}`} onClick={() => setHistory((h) => saveHistory(h.filter((x) => x.id !== c.id)))}><Trash2 /></Button>
        </div>)}
      </div>}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent dir="rtl" className="voice-neon-dialog" aria-describedby="voice-tools-description">
          <DialogTitle>إعدادات الصوت</DialogTitle>
          <DialogDescription id="voice-tools-description" className="sr-only">اختيار البوت والتسجيل ورفع الصوت ومشاركته</DialogDescription>
          <label className="voice-studio-field"><span>صوت البوت</span><div className="voice-studio-select"><UserRound /><select aria-label="البوت المتحدث" value={sayBot || bots[0] || ""} onChange={(e) => setSayBot(e.target.value)}>{bots.map((b) => <option key={b} value={b}>{b}</option>)}</select><ChevronDown /></div></label>
          <div className="voice-studio-actions">
            <Button variant="outline" disabled={!audioFile || testing} onClick={sendToSnapchat}><Send />إرسال لسناب شات</Button>
            <Button variant="outline" onClick={() => document.getElementById("voice-audio-upload")?.click()}><Upload />رفع أغنية أو تسجيل</Button>
            <Button variant="outline" disabled={testing} onClick={toggleRecord}><Mic />{recording ? "إيقاف التسجيل" : "تسجيل صوتي"}</Button>
            <Button variant="outline" disabled={!audioFile || testing || recording} onClick={() => void convertMyVoice()}><AudioLines />حوّل صوتي</Button>
          </div>
      <div className="voice-studio-actions" id="voice-effects" aria-label="مغيّر الصوت المباشر">
        <Button type="button" variant="outline" onClick={() => { if (changerOn) stopChanger(); else void startChanger(); }} className="voice-studio-test"><Radio />{changerOn ? "إيقاف مغيّر الصوت" : "مغيّر الصوت المباشر"}</Button>
        <select className={`${field} w-auto min-w-40`} aria-label="نبرة المغيّر" value={changerRatio} disabled={!changerOn} onChange={(e) => setChangerVoice(Number(e.target.value))}>
          <option value="1.5">بنت ناعمة</option>
          <option value="1.7">بنت دلوعة</option>
          <option value="1.85">بنت صغيرة</option>
          <option value="1.25">صوت خفيف</option>
          <option value="0.6">صوت عميق</option>
        </select>
        <Button type="button" variant="outline" disabled={!changerOn} onClick={toggleChangerRecord} className="voice-studio-download"><AudioLines />{changerRec ? "إيقاف تسجيل المغيّر" : "سجّل الصوت المغيّر"}</Button>
      </div>
      {changerOn && <p className="text-xs font-bold" role="status">المغيّر يعمل الآن — استخدم سماعات 🎧 حتى لا يرجع صوتك من المكبر، وكل ما تتكلم تسمع صوتك الجديد فورًا.</p>}
          <Button asChild variant="outline"><a href="/"><ArrowRight />العودة للموقع</a></Button>
        </DialogContent>
      </Dialog>
      <input id="voice-audio-upload" type="file" accept="audio/*" className="sr-only" aria-label="رفع أغنية" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAudioFile(f); setNote("تم رفع الملف ✓"); } e.target.value = ""; }} />
      {note && <p role="status" className="voice-neon-note">{note}</p>}
    </div>
  </section>;
}

export function VoiceStudioNav() {
  const [active, setActive] = useState("voice-home");
  return <nav className="voice-app-nav" aria-label="تنقل لوحة الأصوات">{[{ id: "voice-home", label: "الرئيسية", icon: Home }, { id: "voice-effects", label: "المؤثرات", icon: AudioLines }, { id: "voice-recordings", label: "التسجيلات", icon: ListMusic }, { id: "voice-settings", label: "الإعدادات", icon: Settings2 }].map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" aria-current={active === id ? "location" : undefined} onClick={() => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}><Icon /><span>{label}</span></Button>)}</nav>;
}

export function VoiceChatManager() {
  const [cfg, setCfg] = useState<VoiceChatConfig>(defaultVoiceChat);
  const [bots, setBots] = useState<string[]>(defaultChatBots.bots.map((b) => b.name));
  const [opener, setOpener] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [clipName, setClipName] = useState("");
  const [clipFile, setClipFile] = useState<File | null>(null);

  useEffect(() => {
    let alive = true;
    for (const clip of cfg.clips) void supabase.storage.from("chat-recordings").createSignedUrl(clip.path, 3600).then(({ data }) => {
      if (alive) setPreviews((v) => ({ ...v, [clip.id]: data?.signedUrl ?? "" }));
    });
    return () => { alive = false; };
  }, [cfg.clips]);

  async function persistClips(next: VoiceChatConfig, removedPath?: string) {
    const { error } = await supabase.from("site_settings").upsert({ key: "voice_chat", value: normalizeVoiceChat(next) as never, updated_at: new Date().toISOString() });
    if (error) throw error;
    setCfg(normalizeVoiceChat(next));
    if (removedPath) await supabase.storage.from("chat-recordings").remove([removedPath]);
  }

  async function addClip(e: React.FormEvent) {
    e.preventDefault();
    if (!clipFile || !clipName.trim()) return;
    const ext = clipFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["mp3", "wav", "m4a", "ogg", "webm"].includes(ext) || !clipFile.type.startsWith("audio/") || clipFile.size > 20 * 1024 * 1024) { setNote("اختر ملف صوت بحجم أقل من 20 ميجابايت."); return; }
    setUploading(true); const path = `recordings/${crypto.randomUUID()}.${ext}`;
    try {
      const { error } = await supabase.storage.from("chat-recordings").upload(path, clipFile, { contentType: clipFile.type });
      if (error) throw error;
      try { await persistClips({ ...cfg, clips: [...cfg.clips, { id: crypto.randomUUID(), name: clipName.trim(), path, enabled: true }] }); }
      catch (error) { await supabase.storage.from("chat-recordings").remove([path]); throw error; }
      setClipName(""); setClipFile(null); setNote("تمت إضافة الصوت وحفظه ✓");
    } catch { setNote("تعذّر إضافة الصوت."); } finally { setUploading(false); }
  }

  useEffect(() => {
    let alive = true;
    for (const key of ["song", "poem"] as const) {
      const path = cfg.recordings[key];
      if (!path) { setPreviews((v) => ({ ...v, [key]: "" })); continue; }
      void supabase.storage.from("chat-recordings").createSignedUrl(path, 3600).then(({ data }) => {
        if (alive) setPreviews((v) => ({ ...v, [key]: data?.signedUrl ?? "" }));
      });
    }
    return () => { alive = false; };
  }, [cfg.recordings.song, cfg.recordings.poem]);

  async function uploadRecording(key: "song" | "poem", file?: File) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["mp3", "wav", "m4a", "ogg", "webm"].includes(ext) || !file.type.startsWith("audio/") || file.size > 20 * 1024 * 1024) {
      setNote("اختر تسجيل MP3 أو WAV أو M4A أو OGG أو WebM بحجم لا يتجاوز 20 ميجابايت."); return;
    }
    setUploading(true); setNote("");
    const path = `recordings/${crypto.randomUUID()}.${ext}`;
    try {
      const { error } = await supabase.storage.from("chat-recordings").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const next = normalizeVoiceChat({ ...cfg, recordings: { ...cfg.recordings, [key]: path } });
      const { error: saveError } = await supabase.from("site_settings").upsert({ key: "voice_chat", value: next as never, updated_at: new Date().toISOString() });
      if (saveError) { await supabase.storage.from("chat-recordings").remove([path]); throw saveError; }
      const old = cfg.recordings[key]; setCfg(next);
      if (old) await supabase.storage.from("chat-recordings").remove([old]);
      setNote("تم رفع التسجيل وحفظه ✓");
    } catch { setNote("تعذّر رفع التسجيل وحفظه؛ حاول مجددًا."); }
    finally { setUploading(false); }
  }

  async function removeRecording(key: "song" | "poem") {
    const path = cfg.recordings[key]; setUploading(true);
    const next = normalizeVoiceChat({ ...cfg, recordings: { ...cfg.recordings, [key]: "" } });
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "voice_chat", value: next as never, updated_at: new Date().toISOString() });
      if (error) throw error;
      setCfg(next); if (path) await supabase.storage.from("chat-recordings").remove([path]);
      setNote("تم حذف التسجيل ✓");
    } catch { setNote("تعذّر حذف التسجيل."); }
    finally { setUploading(false); }
  }

  useEffect(() => {
    void supabase.from("site_settings").select("key,value").in("key", ["voice_chat", "chat_bots"]).then(({ data }) => {
      for (const row of data ?? []) {
        if (row.key === "voice_chat") setCfg(normalizeVoiceChat(row.value));
        if (row.key === "chat_bots") { const b = (row.value as Partial<ChatBotsConfig>)?.bots; if (b?.length) setBots(b.map((x) => x.name)); }
      }
    });
  }, []);

  const update = (patch: Partial<VoiceChatConfig>) => { setCfg((c) => ({ ...c, ...patch })); setNote(""); };
  const toggle = (key: "maleVoices" | "femaleVoices", id: string) => update({ [key]: cfg[key].includes(id) ? cfg[key].filter((v) => v !== id) : [...cfg[key], id] });

  async function save() {
    setBusy(true);
    const next = normalizeVoiceChat(cfg);
    const { error } = await supabase.from("site_settings").upsert({ key: "voice_chat", value: next as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (!error) setCfg(next);
    setNote(error ? "تعذّر الحفظ؛ حاول مجددًا." : "تم حفظ إعدادات الشات الصوتي ✓");
  }

  return <section className="space-y-5 border-y border-border py-6" aria-label="الشات الصوتي">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black">الشات الصوتي</h2>
      <Button type="button" disabled={busy || uploading} onClick={save}><Save />{busy ? "جارٍ الحفظ…" : "حفظ الشات الصوتي"}</Button>
    </div>
    {note && <p className="text-sm font-bold">{note}</p>}
    <div className="space-y-4">
      <h3 className="font-black">مكتبة التسجيلات ({cfg.clips.length})</h3>
      <form onSubmit={addClip} className="grid gap-3 sm:grid-cols-2">
        <input className={field} aria-label="اسم الصوت أو المتحدث" required maxLength={40} placeholder="اسم الصوت أو المتحدث" value={clipName} onChange={(e) => setClipName(e.target.value)} />
        <input aria-label="ملف الصوت الجديد" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" onChange={(e) => setClipFile(e.target.files?.[0] ?? null)} />
        <Button type="submit" disabled={busy || uploading || !clipFile || !clipName.trim() || cfg.clips.length >= 100}><Upload />إضافة وحفظ الصوت</Button>
      </form>
      <ul className="divide-y divide-border">{cfg.clips.map((clip) => <li key={clip.id} className="space-y-2 py-3">
        <div className="flex flex-wrap items-center gap-2"><b className="min-w-0 flex-1 break-words">{clip.name}</b><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clip.enabled} disabled={busy || uploading} onChange={async (e) => { try { await persistClips({ ...cfg, clips: cfg.clips.map((c) => c.id === clip.id ? { ...c, enabled: e.target.checked } : c) }); setNote("تم حفظ التفعيل ✓"); } catch { setNote("تعذّر الحفظ."); } }} />تشغيل</label><Button type="button" size="icon" variant="outline" aria-label={`حذف صوت ${clip.name}`} disabled={busy || uploading} onClick={async () => { if (!confirm("حذف هذا التسجيل؟")) return; setUploading(true); try { await persistClips({ ...cfg, clips: cfg.clips.filter((c) => c.id !== clip.id) }, clip.path); setNote("تم حذف الصوت ✓"); } catch { setNote("تعذّر الحذف."); } finally { setUploading(false); } }}><Trash2 /></Button></div>
        {previews[clip.id] && <audio controls preload="none" src={previews[clip.id]} aria-label={`معاينة ${clip.name}`} className="w-full" />}
      </li>)}</ul>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {(["song", "poem"] as const).map((key) => <div key={key} className="space-y-3 border border-border p-4 rounded-lg">
        <h3 className="font-black">{key === "song" ? "تسجيل نغم · الغناء" : "تسجيل قصيدة · الشعر"}</h3>
        <p className="text-sm text-muted-foreground">{cfg.recordings[key] ? "تسجيل محفوظ" : "لم يرفع تسجيل بعد"}</p>
        {previews[key] && <audio controls preload="metadata" src={previews[key]} className="w-full" aria-label={`معاينة تسجيل ${key === "song" ? "نغم" : "قصيدة"}`} />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={busy || uploading} onClick={() => document.getElementById(`recording-${key}`)?.click()}><Upload />{cfg.recordings[key] ? "استبدال التسجيل" : "رفع تسجيل"}</Button>
          <input id={`recording-${key}`} className="hidden" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg,audio/webm,.mp3,.m4a" aria-label={`تسجيل ${key === "song" ? "نغم" : "قصيدة"}`} onChange={(e) => { void uploadRecording(key, e.target.files?.[0]); e.target.value = ""; }} />
          {cfg.recordings[key] && <Button type="button" variant="outline" size="icon" disabled={busy || uploading} aria-label={`حذف تسجيل ${key}`} onClick={() => void removeRecording(key)}><Trash2 /></Button>}
        </div>
      </div>)}
    </div>
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card/50 p-4">
      <span className="flex-1 font-bold">الشات الصوتي {cfg.enabled ? "مفعّل" : "متوقف"}</span>
      <Button variant={cfg.enabled ? "outline" : "default"} onClick={() => update({ enabled: !cfg.enabled })}>{cfg.enabled ? "إيقاف" : "تشغيل"}</Button>
      <label className="flex items-center gap-2 text-sm">مدة دور كل متحدث (ثانية)
        <input type="number" min={8} max={40} className={`${field} w-20`} value={cfg.turnSeconds} onChange={(e) => update({ turnSeconds: Number(e.target.value) })} />
      </label>
    </div>

    {(["femaleVoices"] as const).map((key) => <div key={key} className="space-y-2">
      <h3 className="font-black">أصوات البنات <span className="text-sm font-normal text-muted-foreground">(اختر الأصوات المستخدمة)</span></h3>
      <div className="flex flex-wrap gap-2">
        {VOICE_LIST.filter((v) => v.female === (key === "femaleVoices")).map((v) => <Button key={v.id} type="button" size="sm" variant={cfg[key].includes(v.id) ? "default" : "outline"} aria-pressed={cfg[key].includes(v.id)} onClick={() => toggle(key, v.id)}>{v.name} · {v.label}</Button>)}
      </div>
    </div>)}

    <div className="space-y-2">
      <h3 className="font-black">صوت كل بوت</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {bots.map((name) => <label key={name} className="flex items-center gap-2 rounded-xl border border-border p-2 text-sm">
          <span className="min-w-0 flex-1 truncate font-bold">{name}</span>
          <select className={`${field} w-40`} value={VOICE_LIST.some((v) => v.id === cfg.botVoices[name] && v.female) ? cfg.botVoices[name] : ""} onChange={(e) => { const botVoices = { ...cfg.botVoices }; if (e.target.value) botVoices[name] = e.target.value; else delete botVoices[name]; update({ botVoices }); }}>
            <option value="">تلقائي</option>
            <optgroup label="بنات">{VOICE_LIST.filter((v) => v.female).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.label}</option>)}</optgroup>
          </select>
        </label>)}
      </div>
    </div>

    <div className="space-y-2">
      <h3 className="font-black">جمل الترحيب (أول متحدث)</h3>
      {cfg.openers.map((o, i) => <div key={i} className="flex items-center gap-2"><p className="flex-1 rounded-xl border border-border p-2 text-sm">{o}</p><Button type="button" size="icon" variant="outline" aria-label="حذف الجملة" onClick={() => update({ openers: cfg.openers.filter((_, j) => j !== i) })}><Trash2 /></Button></div>)}
      <div className="flex gap-2"><input className={field} value={opener} maxLength={300} placeholder="اكتب جملة ترحيب جديدة…" onChange={(e) => setOpener(e.target.value)} /><Button type="button" disabled={!opener.trim()} onClick={() => { update({ openers: [...cfg.openers, opener.trim()] }); setOpener(""); }}><Plus />إضافة</Button></div>
    </div>
    <p className="text-xs text-muted-foreground">لا تنسَ الضغط على «حفظ الشات الصوتي» بعد التعديل.</p>
  </section>;
}

