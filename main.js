// main.js — client-side logic
import { createFFmpeg, fetchFile } from "https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js";

const ffmpeg = createFFmpeg({ log: true });
let uploadedFile = null;
let extractedAudioBlob = null;
let synthesizedAudioBlob = null;

const $ = id => document.getElementById(id);

$('videoFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  uploadedFile = f;
  const url = URL.createObjectURL(f);
  $('videoPreview').src = url;
  $('downloadLink').textContent = '';
});

$('extractBtn').addEventListener('click', async () => {
  if (!uploadedFile) return alert('Pehle video upload karo.');
  $('status').textContent = 'Loading ffmpeg (browser)...';
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  $('status').textContent = 'Writing file to ffmpeg filesystem...';
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(uploadedFile));
  $('status').textContent = 'Extracting audio (this runs in your browser)...';
  // Extract WAV 16k for easier STT usage later
  await ffmpeg.run('-i', 'input.mp4', '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', 'audio.wav');
  const data = ffmpeg.FS('readFile', 'audio.wav');
  extractedAudioBlob = new Blob([data.buffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(extractedAudioBlob);
  $('audioWrap').innerHTML = `<audio controls src="${audioUrl}"></audio>`;
  $('status').textContent = 'Audio extracted. You can listen and paste/edit transcript below.';
});

$('autoSTTBtn').addEventListener('click', async () => {
  // This is an OPTIONAL helper: calls a cloud STT if you provide endpoint/key.
  // By default we show an alert and reference README for integration.
  alert('Automatic STT not enabled by default. See README to integrate Whisper/Cloud STT. For now, paste/enter transcript manually.');
});

$('clearTranscript').addEventListener('click', () => {
  $('transcript').value = '';
});

$('translateBtn').addEventListener('click', async () => {
  const text = $('transcript').value.trim();
  if (!text) return alert('Transcript pehle daalo.');
  const src = $('srcLang').value;
  const tgt = $('tgtLang').value;
  $('status').textContent = 'Translating via LibreTranslate...';
  try {
    const resp = await fetch('https://libretranslate.de/translate', { // public instance; can be changed in README
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ q: text, source: src === 'auto' ? 'auto' : src, target: tgt, format: 'text' })
    });
    const j = await resp.json();
    if (j.error) throw new Error(j.error);
    $('transcript').value = j.translatedText || j;
    $('status').textContent = 'Translation complete.';
  } catch (e) {
    console.error(e);
    $('status').textContent = 'Translation failed: ' + (e.message||e);
    alert('Translation failed. See console for details.');
  }
});

$('synthesizeBtn').addEventListener('click', async () => {
  const text = $('transcript').value.trim();
  if (!text) return alert('Transcript pehle daalo (translate or edit).');
  const engine = $('ttsEngine').value;
  if (engine === 'webspeech') {
    // Browser SpeechSynthesis preview
    const utter = new SpeechSynthesisUtterance(text);
    // choose voice if available
    const voices = speechSynthesis.getVoices();
    // prefer local default voice matching language
    const tgt = $('tgtLang').value || 'hi';
    const candidate = voices.find(v => (v.lang || '').startsWith(tgt)) || voices[0];
    if (candidate) utter.voice = candidate;
    utter.rate = 1;
    utter.pitch = 1;
    // Play preview:
    speechSynthesis.speak(utter);
    $('ttsPreviewWrap').innerHTML = `<div class="muted">Playing synthesized audio via Browser TTS (Web Speech API). To embed synthesized audio into the video, click "Merge" — this will record the spoken output into an audio blob automatically if supported.</div>`;
    // We'll capture speech via MediaStream if browser permits when merging.
  } else {
    alert('External TTS selected. Configure API in README and use synthAndSetBlob() function.');
  }
});

async function synthAndSetBlob(text) {
  // Placeholder: Use external TTS API to get audio file (wav/mp3) and store in synthesizedAudioBlob.
  // Example: fetch TTS provider, then synthesizedAudioBlob = new Blob([await resp.arrayBuffer()], {type:'audio/wav'})
  throw new Error('Not implemented: synthAndSetBlob requires external TTS provider or advanced browser capture.');
}

// Merge step: merge synthesizedAudioBlob (or captured browser TTS recording) into video
$('mergeBtn').addEventListener('click', async () => {
  if (!uploadedFile) return alert('Video upload karo.');
  // Attempt to capture browser TTS output into a blob if SpeechSynthesis was used.
  $('status').textContent = 'Preparing to merge...';

  if (!extractedAudioBlob) {
    // try extracting audio first
    $('status').textContent = 'No extracted audio found. Please extract audio first.';
    return;
  }

  // If user used external TTS (synthesizedAudioBlob), use that. Otherwise try to record browser TTS.
  if (!synthesizedAudioBlob) {
    // Try capture by instructing user to allow tab audio capture using getDisplayMedia (workaround)
    const ok = confirm('If you used Browser TTS (Web Speech API) for preview, we can record the tab audio to create the dubbed track. Recording requires you to allow "Share audio" of the tab — proceed?');
    if (!ok) return;
    try {
      // Capture tab audio via getDisplayMedia (user will be prompted to share this tab and allow audio)
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        synthesizedAudioBlob = new Blob(chunks, { type: 'audio/webm' });
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        await mergeWithFFmpeg(synthesizedAudioBlob);
      };
      recorder.start();
      // Play synthesized speech again so it's captured
      const text = $('transcript').value.trim();
      const utter = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const tgt = $('tgtLang').value || 'hi';
      const candidate = voices.find(v => (v.lang || '').startsWith(tgt)) || voices[0];
      if (candidate) utter.voice = candidate;
      speechSynthesis.speak(utter);
      // Wait: stop recording after a reasonable time ~ estimated from text length
      const estMs = Math.max(2000, text.split(/\s+/).length * 250);
      setTimeout(() => { try{ recorder.stop(); } catch(e){} }, estMs + 500);
      $('status').textContent = 'Recording browser TTS audio (allow tab audio capture).';
    } catch (e) {
      console.error(e);
      alert('Tab audio capture failed or denied. For reliable results, integrate an external TTS that returns an audio file (see README).');
      $('status').textContent = 'Recording failed: ' + (e.message||e);
    }
  } else {
    // we already have synthesizedAudioBlob
    await mergeWithFFmpeg(synthesizedAudioBlob);
  }
});

async function mergeWithFFmpeg(dubBlob) {
  $('status').textContent = 'Loading ffmpeg (if needed)...';
  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  $('status').textContent = 'Writing files to ffmpeg filesystem...';
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(uploadedFile));
  ffmpeg.FS('writeFile', 'dub.webm', await fetchFile(dubBlob));
  $('status').textContent = 'Merging dubbed audio into video (browser)...';

  // Convert dub.webm -> dub.wav (or pcm), then map into output
  try {
    await ffmpeg.run('-i', 'dub.webm', '-vn', '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2', 'dub.wav');
    // Now replace audio track
    await ffmpeg.run('-i', 'input.mp4', '-i', 'dub.wav', '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', 'output_dubbed.mp4');
    const out = ffmpeg.FS('readFile', 'output_dubbed.mp4');
    const blob = new Blob([out.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    $('downloadLink').href = url;
    $('downloadLink').download = 'dubbed_output.mp4';
    $('downloadLink').textContent = 'Download dubbed_output.mp4';
    $('status').textContent = 'Done — download ready.';
  } catch (e) {
    console.error(e);
    $('status').textContent = 'Merging failed: ' + (e.message||e);
    alert('Merging failed. See console for details.');
  }
}
