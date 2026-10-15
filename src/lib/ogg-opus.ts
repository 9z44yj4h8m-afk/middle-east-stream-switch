// Browser-only: converts any audio file to Ogg/Opus so Telegram shows it as a voice message (waveform) instead of a file.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; }
  return t;
})();
function crc(bytes: Uint8Array) { let c = 0; for (const b of bytes) c = ((c << 8) ^ CRC_TABLE[((c >>> 24) ^ b) & 0xff]!) >>> 0; return c; }

function page(packet: Uint8Array, granule: bigint, serial: number, seq: number, type: number) {
  const segs: number[] = [];
  let n = packet.length;
  while (n >= 255) { segs.push(255); n -= 255; }
  segs.push(n);
  const out = new Uint8Array(27 + segs.length + packet.length);
  const v = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53], 0);
  out[5] = type;
  v.setBigInt64(6, granule, true);
  v.setUint32(14, serial, true);
  v.setUint32(18, seq, true);
  out[26] = segs.length;
  out.set(segs, 27);
  out.set(packet, 27 + segs.length);
  v.setUint32(22, crc(out), true);
  return out;
}

export function canMakeVoiceNote() {
  return typeof window !== "undefined" && "AudioEncoder" in window && "OfflineAudioContext" in window;
}

export async function toOggOpus(file: File, name: string): Promise<File> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  void ctx.close();
  const rate = 48000;
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = off.createBufferSource(); src.buffer = decoded; src.connect(off.destination); src.start();
  const pcm = (await off.startRendering()).getChannelData(0);

  const packets: { data: Uint8Array; samples: number }[] = [];
  let error: unknown = null;
  const enc = new AudioEncoder({
    output: (chunk) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); packets.push({ data: d, samples: Math.round(((chunk.duration ?? 20000) / 1e6) * rate) }); },
    error: (e) => { error = e; },
  });
  enc.configure({ codec: "opus", sampleRate: rate, numberOfChannels: 1, bitrate: 48000 });
  const frame = 960;
  for (let i = 0; i < pcm.length; i += frame) {
    const slice = new Float32Array(frame); slice.set(pcm.subarray(i, i + frame));
    const ad = new AudioData({ format: "f32", sampleRate: rate, numberOfFrames: frame, numberOfChannels: 1, timestamp: Math.round((i / rate) * 1e6), data: slice });
    enc.encode(ad); ad.close();
  }
  await enc.flush(); enc.close();
  if (error || !packets.length) throw error ?? new Error("encode failed");

  const serial = (Math.random() * 0xffffffff) >>> 0;
  const preskip = 312;
  const head = new Uint8Array(19); const hv = new DataView(head.buffer);
  head.set(new TextEncoder().encode("OpusHead")); head[8] = 1; head[9] = 1; hv.setUint16(10, preskip, true); hv.setUint32(12, rate, true);
  const vendor = new TextEncoder().encode("almoghani");
  const tags = new Uint8Array(8 + 4 + vendor.length + 4); const tv = new DataView(tags.buffer);
  tags.set(new TextEncoder().encode("OpusTags")); tv.setUint32(8, vendor.length, true); tags.set(vendor, 12);
  const pages = [page(head, 0n, serial, 0, 2), page(tags, 0n, serial, 1, 0)];
  let granule = BigInt(preskip);
  packets.forEach((p, i) => { granule += BigInt(p.samples); pages.push(page(p.data, granule, serial, i + 2, i === packets.length - 1 ? 4 : 0)); });
  return new File(pages as BlobPart[], `${name}.ogg`, { type: "audio/ogg" });
}
