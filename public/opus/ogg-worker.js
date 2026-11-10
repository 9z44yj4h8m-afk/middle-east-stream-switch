// Encodes mono Float32 PCM into an OGG/Opus voice note (Telegram/WhatsApp voice-message format).
self.OPUS_SCRIPT_LOCATION = "/opus/";
importScripts("/opus/libopus-encoder.js", "/opus/oggOpusEncoder.js");
var Lib = self.OpusEncoderLib;
function ready() {
  return new Promise(function (r) {
    if (Lib.isReady) return r();
    var t = setInterval(function () { if (Lib.isReady) { clearInterval(t); r(); } }, 30);
  });
}
onmessage = async function (e) {
  try {
    await ready();
    var pcm = e.data.pcm, rate = e.data.sampleRate;
    var enc = new OggOpusEncoder({ originalSampleRate: rate, encoderSampleRate: 48000, numberOfChannels: 1, encoderApplication: 2048, bitRate: 32000 }, Lib);
    var pages = [enc.generateIdPage().page, enc.generateCommentPage().page];
    for (var i = 0; i < pcm.length; i += 4096) enc.encode([pcm.subarray(i, i + 4096)]).forEach(function (p) { pages.push(p.page); });
    enc.encodeFinalFrame().forEach(function (p) { pages.push(p.page); });
    enc.destroy();
    postMessage({ blob: new Blob(pages, { type: "audio/ogg" }) });
  } catch (err) { postMessage({ error: String(err) }); }
};
