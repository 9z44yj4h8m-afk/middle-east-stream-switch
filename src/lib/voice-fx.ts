// Browser-only voice effects: studio echo and a soft synthesized oud/piano bed, rendered offline into one WAV.
export type EchoMode = "none" | "light" | "grand";
export type BedMode = "none" | "oud" | "piano" | "calm";

export const ECHO_OPTIONS: { id: EchoMode; label: string }[] = [
  { id: "none", label: "بدون صدى" },
  { id: "light", label: "صدى استوديو خفيف" },
  { id: "grand", label: "صدى فخم" },
];
export const BED_OPTIONS: { id: BedMode; label: string }[] = [
  { id: "none", label: "بدون لحن" },
  { id: "oud", label: "عود خليجي هادئ" },
  { id: "piano", label: "بيانو كلاسيكي" },
  { id: "calm", label: "نغمة هادئة" },
];

function impulse(ctx: BaseAudioContext, seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

// Hijaz-flavoured scale for the oud, plain major chords for the piano.
const OUD_NOTES = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 261.63, 293.66];
const PIANO_CHORDS = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]];

function scheduleBed(ctx: OfflineAudioContext, mode: BedMode, duration: number, out: AudioNode) {
  const note = (freq: number, t: number, len: number, type: OscillatorType, vol: number) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (mode === "calm" ? 0.8 : 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(out); o.start(t); o.stop(t + len + 0.05);
  };
  if (mode === "oud") {
    for (let t = 0, i = 0; t < duration; t += 0.45, i++) {
      const f = OUD_NOTES[(i * 3 + (i % 4)) % OUD_NOTES.length] ?? 220;
      note(f, t, 0.9, "triangle", 0.18); note(f * 2, t, 0.4, "sawtooth", 0.025);
    }
  } else if (mode === "piano") {
    for (let t = 0, i = 0; t < duration; t += 2, i++) PIANO_CHORDS[i % 4]!.forEach((f, k) => note(f, t + k * 0.12, 2.4, "sine", 0.12));
  } else if (mode === "calm") {
    for (let t = 0, i = 0; t < duration; t += 3, i++) PIANO_CHORDS[i % 4]!.forEach((f) => { note(f / 2, t, 3.6, "sine", 0.08); note(f, t, 3.6, "triangle", 0.03); });
  }
}

function toWav(buf: AudioBuffer) {
  const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); out.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, rate, true);
  out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let p = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c]![i]!)); out.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true); p += 2; }
  return new Uint8Array(out.buffer);
}

export async function applyVoiceFx(wav: Uint8Array<ArrayBuffer>, echo: EchoMode, bed: BedMode): Promise<Uint8Array<ArrayBuffer>> {
  if (echo === "none" && bed === "none") return wav.slice();
  const probe = new AudioContext();
  const src = await probe.decodeAudioData(wav.slice().buffer as ArrayBuffer);
  void probe.close();
  const tail = echo === "grand" ? 2.5 : echo === "light" ? 1 : 0.8;
  const rate = src.sampleRate;
  const ctx = new OfflineAudioContext(2, Math.ceil((src.duration + tail) * rate), rate);
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const voice = ctx.createBufferSource(); voice.buffer = src;
  voice.connect(master);
  if (echo !== "none") {
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, echo === "grand" ? 2.8 : 1.2, echo === "grand" ? 2 : 3.5);
    const wet = ctx.createGain(); wet.gain.value = echo === "grand" ? 0.45 : 0.25;
    voice.connect(verb).connect(wet).connect(master);
    if (echo === "grand") {
      const delay = ctx.createDelay(1); delay.delayTime.value = 0.28;
      const fb = ctx.createGain(); fb.gain.value = 0.3;
      voice.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet);
    }
  }
  if (bed !== "none") {
    const bus = ctx.createGain(); bus.gain.value = 0.55;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    bus.connect(lp).connect(master);
    scheduleBed(ctx, bed, src.duration + tail, bus);
  }
  voice.start(0);
  return toWav(await ctx.startRendering());
}

// ---- Recent clips kept on this device so replaying/resending never costs new credits ----
export type SavedClip = { id: string; name: string; text: string; at: number; data: string };
const HISTORY_KEY = "almoghani-voice-history";
export const HISTORY_MAX = 6;

export function loadHistory(): SavedClip[] {
  try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveHistory(list: SavedClip[]): SavedClip[] {
  let next = list.slice(0, HISTORY_MAX);
  while (next.length) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); return next; } catch { next = next.slice(0, -1); }
  }
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  return next;
}
export function bytesToBase64(bytes: Uint8Array) {
  let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
