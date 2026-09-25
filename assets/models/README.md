# Whisper model asset

`ggml-base.bin` in this folder is bundled into the app and loaded by `whisper.rn`
for on-device transcription (`src/lib/transcription.ts`).

**The committed `ggml-base.bin` is a tiny placeholder, not a real model.** Replace
it with the real model before building a usable APK. The app only transcribes
English, so it uses the English-only base model in its compressed ("q5_1") form,
about 57 MB. The full-size multilingual one is 142 MB and made the Play Store
download uncomfortably close to Play's 200 MB limit.

```bash
# ~57 MB. Run once at build time (not at app runtime — the app is fully offline).
curl -L -o assets/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin
```

The file keeps the name `ggml-base.bin` even though it is the English-only
compressed model, so no code has to change.

Keep the filename `ggml-base.bin` — `src/lib/transcription.ts` does
`require('../../assets/models/ggml-base.bin')`, and Metro treats `.bin` as an
asset via `metro.config.js`.

> Audio format note: whisper.rn decodes **PCM WAV only**. DayFeed records voice
> notes as 16 kHz mono WAV (via `@fugood/react-native-audio-pcm-stream`) so they
> feed the model directly. See the project README's transcription section.
