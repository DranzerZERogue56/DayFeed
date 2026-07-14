# Whisper model asset

`ggml-base.bin` in this folder is bundled into the app and loaded by `whisper.rn`
for on-device transcription (`src/lib/transcription.ts`).

**The committed `ggml-base.bin` is a tiny placeholder, not a real model.** Replace
it with the real whisper base model before building a usable APK:

```bash
# ~142 MB. Run once at build time (not at app runtime — the app is fully offline).
curl -L -o assets/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

Keep the filename `ggml-base.bin` — `src/lib/transcription.ts` does
`require('../../assets/models/ggml-base.bin')`, and Metro treats `.bin` as an
asset via `metro.config.js`.

> Audio format note: whisper.rn decodes **PCM WAV only**. DayFeed records voice
> notes as 16 kHz mono WAV (via `@fugood/react-native-audio-pcm-stream`) so they
> feed the model directly. See the project README's transcription section.
