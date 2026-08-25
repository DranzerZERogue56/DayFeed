import { requestRecordingPermissionsAsync } from 'expo-audio';
import AudioRecord from '@fugood/react-native-audio-pcm-stream';
import { Buffer } from 'buffer';

// The single owner of the microphone.
//
// WHY THIS EXISTS. @fugood/react-native-audio-pcm-stream is a global singleton
// in the worst way — read its index.js:
//
//     AudioRecord.on = (event, callback) => {
//       EventEmitter.removeAllListeners(nativeEvent);   // <-- steals the stream
//       return EventEmitter.addListener(nativeEvent, callback);
//     };
//
// `on()` removes every existing listener before adding one, and init/start/stop
// are likewise process-global. So two features that both want the mic cannot
// simply both call it: whoever registers last silently deafens the other, and
// the loser never finds out. Everything that wants PCM goes through this module
// instead, and nothing else in the app may import AudioRecord.
//
// Owners are prioritised, not queued: a hold-to-record gesture preempts the
// wake-word listener, and the listener resumes by itself when the recording
// ends. The native stream is deliberately left *running* across that swap —
// see the comment on startStream() for why stopping it is expensive.

export const SAMPLE_RATE = 16000;
export const CHANNELS = 1;
export const BITS = 16;
/** 16 kHz × 1 ch × 16 bit = 32000 bytes of PCM per second. */
export const BYTES_PER_SEC = (SAMPLE_RATE * CHANNELS * BITS) / 8;
/**
 * 8192 bytes = 4096 samples = 256 ms per 'data' event. The native side takes
 * max(this, AudioRecord.getMinBufferSize(...)), so it is a floor, not a promise.
 */
const BUFFER_SIZE = 8192;

/**
 * Highest priority first. A higher-priority owner preempts a lower one.
 *
 * 'recorder' is the hold-to-record gesture, 'dictation' the voice-note overlay,
 * 'wake' the always-listening word spotter. They are distinct ids rather than
 * one shared "foreground" id because acquiring replaces a registration by id —
 * two features sharing an id would silently overwrite each other's handler,
 * which is the exact class of bug this module exists to prevent.
 */
const PRIORITY = ['recorder', 'dictation', 'wake'] as const;
export type MicOwner = (typeof PRIORITY)[number];

export type ChunkHandler = (pcm: Buffer) => void;

export interface OwnerHooks {
  /** Fired when a higher-priority owner takes the stream away. */
  onSuspend?: () => void;
  /** Fired when the stream comes back. State built from chunks is stale by now. */
  onResume?: () => void;
}

interface Registration extends OwnerHooks {
  onChunk: ChunkHandler;
}

const owners = new Map<MicOwner, Registration>();
let listenerBound = false;
let streaming = false;
let active: MicOwner | null = null;

// acquire/release can interleave (a gesture starting while the wake listener is
// arming). Serialise every native start/stop through one chain so the module
// never issues an init() concurrently with a stop().
let transition: Promise<unknown> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = transition.then(fn, fn);
  transition = next.catch(() => undefined);
  return next;
}

function topOwner(): MicOwner | null {
  for (const name of PRIORITY) if (owners.has(name)) return name;
  return null;
}

/** Recompute who is being fed, firing suspend/resume across the change. */
function updateActive(): void {
  const next = topOwner();
  if (next === active) return;
  const previous = active;
  active = next;
  if (previous) owners.get(previous)?.onSuspend?.();
  if (next) owners.get(next)?.onResume?.();
}

function fanOut(base64: string): void {
  if (!active) return;
  const registration = owners.get(active);
  if (!registration) return;
  registration.onChunk(Buffer.from(base64, 'base64'));
}

async function startStream(): Promise<boolean> {
  if (streaming) return true;
  if (!listenerBound) {
    AudioRecord.on('data', fanOut);
    listenerBound = true;
  }
  try {
    // init() must run before EVERY start(), not just the first. The native
    // recording thread ends with `recorder.release(); recorder = null;` in its
    // finally block, and start() begins with `if (recorder == null) return;` —
    // so a start() after a stop() without a fresh init() is a silent no-op and
    // the mic simply never comes back. init() also rejects when another app
    // holds the mic, which is the only signal we get for that.
    await AudioRecord.init({
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitsPerSample: BITS,
      audioSource: 6, // Android VOICE_RECOGNITION
      bufferSize: BUFFER_SIZE,
      // The typings claim this makes the native side write a WAV file. It does
      // not — nothing reads this option. Callers assemble their own file.
      wavFile: 'unused.wav',
    });
  } catch {
    return false;
  }
  AudioRecord.start();
  streaming = true;
  return true;
}

function stopStream(): void {
  if (!streaming) return;
  AudioRecord.stop();
  streaming = false;
}

/** Ask for microphone access. Safe to call repeatedly; the OS caches a grant. */
export async function ensureMicPermission(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

/**
 * Take the mic for `owner`, starting the native stream if it is not running.
 *
 * Does NOT request permission — callers do that first, so they can tell a
 * denial apart from a native failure. Returns false only if the stream could
 * not be started (typically another app holds the mic).
 */
export async function acquire(
  owner: MicOwner,
  onChunk: ChunkHandler,
  hooks: OwnerHooks = {},
): Promise<boolean> {
  owners.set(owner, { onChunk, ...hooks });
  const ok = await runExclusive(startStream);
  if (!ok) {
    owners.delete(owner);
    updateActive();
    return false;
  }
  updateActive();
  return true;
}

/**
 * Give up the mic. If a lower-priority owner is still registered it takes over
 * and the stream keeps running; the stream only stops once nobody holds it.
 */
export function release(owner: MicOwner): void {
  if (!owners.delete(owner)) return;
  updateActive();
  if (owners.size === 0) void runExclusive(async () => stopStream());
}

/** Which owner is currently being fed chunks, if any. */
export function activeOwner(): MicOwner | null {
  return active;
}

/** Whether `owner` currently holds (or is queued behind) the mic. */
export function holds(owner: MicOwner): boolean {
  return owners.has(owner);
}
