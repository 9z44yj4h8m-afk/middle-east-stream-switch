import { useEffect, useRef, useState } from "react";
import { RealGirlVoice } from "@/components/admin/real-girl-voice";

// Real-time pitch shifter (two crossfaded delay taps) run in an AudioWorklet.
const WORKLET = `
class Shift extends AudioWorkletProcessor {
  static get parameterDescriptors(){return [{name:'ratio',defaultValue:1.5,minValue:0.5,maxValue:2.5}];}
  constructor(){super();this.size=2048;this.buf=new Float32Array(8192);this.w=0;this.p=0;}
  process(ins,outs,params){
    const i=ins[0]&&ins[0][0], o=outs[0][0]; if(!i||!o) return true;
    const r=params.ratio[0], N=this.buf.length, S=this.size;
    for(let n=0;n<i.length;n++){
      this.buf[this.w]=i[n];
      this.p=(this.p+(1-r)+S)%S;
      const d1=this.p, d2=(this.p+S/2)%S;
      const g1=Math.sin(Math.PI*d1/S), g2=Math.sin(Math.PI*d2/S);
      const rd=(d)=>{let x=this.w-d; while(x<0)x+=N; const a=Math.floor(x), f=x-a; return this.buf[a%N]*(1-f)+this.buf[(a+1)%N]*f;};
      const v=rd(d1)*g1*g1+rd(d2)*g2*g2;
      for(let c=0;c<outs[0].length;c++) outs[0][c][n]=v;
      this.w=(this.w+1)%N;
    }
    return true;
  }
}
registerProcessor('voice-shift',Shift);`;

const PRESETS = [
  { id: "girl", label: "بنت", ratio: 1.55 },
  { id: "soft", label: "ناعم", ratio: 1.4 },
  { id: "young", label: "صغيرة", ratio: 1.8 },
];

export function MicVoiceChanger() {
  const [on, setOn] = useState(false);
  const [ratio, setRatio] = useState(1.55);
  const [hear, setHear] = useState(true);
  const [rec, setRec] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const ref = useRef<{ ctx: AudioContext; node: AudioWorkletNode; stream: MediaStream; out: GainNode; dest: MediaStreamAudioDestinationNode; rec?: MediaRecorder } | null>(null);

  useEffect(() => () => stop(), []);
  useEffect(() => { ref.current?.node.parameters.get("ratio")?.setValueAtTime(ratio, ref.current.ctx.currentTime); }, [ratio]);
  useEffect(() => { if (ref.current) ref.current.out.gain.value = hear ? 1 : 0; }, [hear]);

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "voice-shift");
      node.parameters.get("ratio")?.setValueAtTime(ratio, ctx.currentTime);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 180;
      const air = ctx.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 3500; air.gain.value = 4;
      const out = ctx.createGain(); out.gain.value = hear ? 1 : 0;
      const dest = ctx.createMediaStreamDestination();
      src.connect(node).connect(hp).connect(air);
      air.connect(out).connect(ctx.destination);
      air.connect(dest);
      ref.current = { ctx, node, stream, out, dest };
      setOn(true);
    } catch {
      setErr("ما قدرت أشغّل المايك. اسمح للموقع باستخدام المايك من إعدادات سفاري.");
    }
  }

  function stop() {
    const r = ref.current; if (!r) return;
    r.rec?.state === "recording" && r.rec.stop();
    r.stream.getTracks().forEach((t) => t.stop());
    void r.ctx.close();
    ref.current = null; setOn(false); setRec(false);
  }

  function toggleRec() {
    const r = ref.current; if (!r) return;
    if (rec) { r.rec?.stop(); setRec(false); return; }
    const chunks: Blob[] = [];
    const m = new MediaRecorder(r.dest.stream);
    m.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    m.onstop = () => { const b = new Blob(chunks, { type: m.mimeType || "audio/mp4" }); setClip((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); }); };
    m.start(); r.rec = m; setRec(true);
  }

  return (
    <section className="rounded-2xl border border-primary/40 bg-card p-4 mb-4 space-y-3" aria-label="تحويل صوتي">
      <h2 className="text-lg font-bold text-primary">🎙️ حوّل صوتي لصوت بنت</h2>
      <p className="text-sm text-muted-foreground">شغّل المايك وتكلم، وصوتك يطلع صوت بنت مباشرة. استخدم سماعة عشان ما يصير صدى.</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => setRatio(p.ratio)}
            className={`rounded-full px-4 py-1.5 text-sm border ${Math.abs(ratio - p.ratio) < 0.01 ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>{p.label}</button>
        ))}
      </div>
      <label className="block text-sm text-foreground">نعومة الصوت
        <input type="range" min={1.1} max={2.2} step={0.05} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="w-full accent-primary" />
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={hear} onChange={(e) => setHear(e.target.checked)} /> أسمع صوتي وأنا أتكلم
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={on ? stop : start} className={`rounded-xl px-5 py-2.5 font-bold ${on ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
          {on ? "إيقاف المايك" : "شغّل المايك"}
        </button>
        {on && <button type="button" onClick={toggleRec} className="rounded-xl px-5 py-2.5 font-bold border border-primary text-primary">{rec ? "⏹ إيقاف التسجيل" : "⏺ سجّل"}</button>}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {clip && <div className="space-y-2"><audio src={clip} controls className="w-full" />}
        <a href={clip} download="sawt-bint.m4a" className="inline-block rounded-xl px-4 py-2 text-sm border border-primary text-primary">حفظ المقطع</a></div>}
      <div className="border-t border-border pt-3">
        <RealGirlVoice bare />
      </div>
    </section>
  );
}
