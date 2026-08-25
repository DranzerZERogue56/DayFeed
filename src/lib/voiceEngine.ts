import { getSetting, setSetting } from '../db/settings';

// Which transcriber turns speech into a note.
//
// The two engines are not variations on one mechanism — they are structurally
// different, and the difference is forced on us by how Wispr Flow works on
// Android.
//
// 'whisper' — DayFeed holds the microphone, records PCM, and runs whisper.rn
//   on-device. Fully offline. Nothing leaves the phone.
//
// 'flow' — Wispr Flow is NOT a keyboard and exposes no API, intent or SDK. It
//   is a floating bubble that uses an accessibility service to spot a focused
//   text field and inject text into it. So DayFeed cannot call it; all DayFeed
//   can do is present a focused field and stay out of the way. Critically that
//   means DayFeed must NOT take the microphone in this mode — Flow needs it —
//   and Flow needs an internet connection, so dictated audio leaves the phone.
//
// Whisper is therefore not only the fallback for uninstalling Flow; it is the
// fallback for having no signal.
//
// The module owns its key and its loader so screens never import db/settings
// directly — the same shape as FLY_PROMPT_KEY / loadFlyPrompt().

export type VoiceEngine = 'flow' | 'whisper';

export const VOICE_ENGINE_KEY = 'voice.engine';

/** Flow by default: it is the better transcriber when it is available. */
export const DEFAULT_VOICE_ENGINE: VoiceEngine = 'flow';

function isVoiceEngine(value: string | null): value is VoiceEngine {
  return value === 'flow' || value === 'whisper';
}

/**
 * The stored engine, or the default when absent or unrecognised.
 *
 * There is deliberately no "is Flow installed?" probe. Answering that needs a
 * native package-manager query this app has no module for, and a wrong guess
 * would silently pick the engine the user didn't want. The setting plus the
 * dictation sheet's idle timeout handle a missing Flow honestly instead.
 */
export async function loadVoiceEngine(): Promise<VoiceEngine> {
  const stored = await getSetting(VOICE_ENGINE_KEY);
  return isVoiceEngine(stored) ? stored : DEFAULT_VOICE_ENGINE;
}

export async function saveVoiceEngine(engine: VoiceEngine): Promise<void> {
  await setSetting(VOICE_ENGINE_KEY, engine);
}
