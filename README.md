\# Client-side Video Dubber (Static web demo)



\*\*Goal:\*\* Browser-only video dubbing pipeline:

\- Upload video → extract audio (ffmpeg.wasm) → edit transcript → translate (LibreTranslate) → synthesize (browser TTS or external) → merge dubbed audio into video → download.



\## Features included in this starter:

\- Video upload \& preview

\- Audio extraction via `@ffmpeg/ffmpeg` (ffmpeg.wasm)

\- Editable transcript area (manual paste/edit)

\- Translate using LibreTranslate public endpoint

\- Browser TTS preview (Web Speech API)

\- Tab-audio capture trick to record browser TTS into an audio blob

\- Merge dubbed audio into video using ffmpeg.wasm and provide downloadable MP4



\## Caveats \& next steps

1\. \*\*Automatic STT:\*\* This starter does NOT include automatic speech-to-text (STT) from audio. Options to add:

&nbsp;  - Integrate `whisper.cpp` WASM (browser port) — requires model files and extra setup.

&nbsp;  - Use a cloud STT API (AssemblyAI, Google Speech-to-Text, OpenAI Whisper API) — secure API key required.

2\. \*\*High-quality TTS:\*\* Browser TTS is convenient but limited. For better voices:

&nbsp;  - Use cloud TTS APIs (ElevenLabs, Google Cloud TTS, Amazon Polly, Coqui TTS).

&nbsp;  - These return audio files which you can feed into the merge step (`synthesizedAudioBlob`).

3\. \*\*Privacy \& Cost:\*\* This approach is client-side and preserves privacy. Cloud STT/TTS will send data to external providers.

4\. \*\*Performance:\*\* ffmpeg.wasm \& large model downloads can be heavy. For long videos prefer server-side processing.



\## How to host

\- Push to GitHub repo.

\- Enable GitHub Pages (or host on Cloudflare Pages / Netlify).

\- Open `index.html` URL in modern Chrome/Edge for best experience.



\## Useful links \& repos

\- ffmpeg.wasm: https://github.com/ffmpegwasm/ffmpeg.wasm

\- whisper.cpp (browser ports): search `whisper.cpp wasm` and follow docs to add on-demand STT.

\- LibreTranslate public instances: https://libretranslate.de or self-host.



\## To integrate automatic STT (example steps)

1\. Add `whisper.cpp` wasm into `static/whisper/` and load its JS wrapper in `main.js`.

2\. After extracting `audio.wav`, send bytes to whisper wasm transcriber and set `transcript` textarea value.

3\. Or, call cloud STT API by uploading the blob to your backend (recommended) and returning transcript.



\## To integrate cloud TTS (example)

\- Implement `synthAndSetBlob(text)` in `main.js`.

\- Call your TTS provider (requires key) to get a `wav/mp3` response and set `synthesizedAudioBlob` to that blob.

\- Then call Merge.



\## Final notes

This repo is purposely minimal and focuses on \*no-download, unlimited browser usage\*. It gives a practical base to add high-quality models or paid backends later.



If you want, I can:

\- Provide a ready `whisper.cpp` browser integration (requires hosting model files).

\- Add a sample cloud STT/TTS integration example using a free trial API (you will need to add your API key).

\- Convert this into a deployable GitHub Pages repo with a single click deploy.



Which next step chahoge? (Add Whisper WASM / Add cloud STT sample / Provide one-click GitHub repo content)



