// Cheap time-domain audio analysis over 16 kHz mono 16-bit PCM.
//
// Pure functions and small state machines over typed arrays — no native calls,
// no React, no mic — so all of it is unit-testable without a device.
//
// This is the first stage of two pipelines: it decides when the user started
// and stopped talking, which is what lets dictation stop by itself, and what
// keeps the wake-word detector from doing real work in a quiet room.

/** Reinterpret a byte buffer of little-endian 16-bit samples as Int16Array. */
export function pcm16(bytes: Uint8Array): Int16Array {
  // A Buffer's byteOffset is rarely 0 (Node pools allocations), and Int16Array
  // requires 2-byte alignment, so an odd offset would throw. Copy in that case.
  if (bytes.byteOffset % 2 === 0) {
    return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Int16Array(copy.buffer, 0, copy.byteLength >> 1);
}

/** Root-mean-square amplitude, normalised to roughly 0..1. */
export function rms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i] / 32768;
    sum += s * s;
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * An exponentially-weighted estimate of the room's background level.
 *
 * Tracks quiet fast and loud slow, deliberately: it must settle to the noise
 * floor of a room quickly, but must NOT creep upward while someone is talking,
 * or a long sentence would raise the floor above itself and the endpointer
 * would decide the speech had stopped.
 */
export class NoiseFloor {
  private value: number | null = null;

  constructor(
    private readonly fallRate = 0.25,
    private readonly riseRate = 0.02,
  ) {}

  /** Feed one frame's energy; returns the updated floor. */
  update(energy: number): number {
    if (this.value === null) {
      this.value = energy;
    } else {
      const rate = energy < this.value ? this.fallRate : this.riseRate;
      this.value += (energy - this.value) * rate;
    }
    return this.value;
  }

  /** Current floor, or null before any frame has been seen. */
  get level(): number | null {
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export type EndpointEvent = 'speech-start' | 'speech-end' | null;

export interface EndpointerOptions {
  /**
   * How far above the noise floor counts as speech. A ratio, not an absolute:
   * it has to work in a silent bedroom and a noisy car.
   */
  threshold?: number;
  /** Absolute floor, so near-silence can never be scaled up into "speech". */
  minEnergy?: number;
  /** Consecutive loud frames before speech-start fires. Rejects clicks. */
  startFrames?: number;
  /** Consecutive quiet frames before speech-end fires — the hang-over. */
  endFrames?: number;
}

/**
 * Decides when an utterance begins and ends, from frame energies alone.
 *
 * Deliberately hysteretic: `startFrames` stops a door slam becoming an
 * utterance, and `endFrames` stops the pause between two words ending one.
 */
export class Endpointer {
  private readonly threshold: number;
  private readonly minEnergy: number;
  private readonly startFrames: number;
  private readonly endFrames: number;

  private readonly floor = new NoiseFloor();
  private speaking = false;
  private loudRun = 0;
  private quietRun = 0;

  constructor(options: EndpointerOptions = {}) {
    this.threshold = options.threshold ?? 3.5;
    this.minEnergy = options.minEnergy ?? 0.006;
    this.startFrames = options.startFrames ?? 2;
    this.endFrames = options.endFrames ?? 6;
  }

  /** Feed one frame's energy. Returns an event on a transition, else null. */
  push(energy: number): EndpointEvent {
    // While speaking, hold the floor still. Updating it with speech energy is
    // exactly how a long utterance talks itself into an early speech-end.
    const floor = this.speaking ? (this.floor.level ?? 0) : this.floor.update(energy);
    const loud = energy > Math.max(this.minEnergy, floor * this.threshold);

    if (loud) {
      this.loudRun += 1;
      this.quietRun = 0;
    } else {
      this.quietRun += 1;
      this.loudRun = 0;
    }

    if (!this.speaking && this.loudRun >= this.startFrames) {
      this.speaking = true;
      this.quietRun = 0;
      return 'speech-start';
    }
    if (this.speaking && this.quietRun >= this.endFrames) {
      this.speaking = false;
      this.loudRun = 0;
      return 'speech-end';
    }
    return null;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * Forget everything, including the noise floor. Call this whenever the audio
   * stream was interrupted — state built from chunks that are no longer
   * contiguous describes a room that no longer exists.
   */
  reset(): void {
    this.floor.reset();
    this.speaking = false;
    this.loudRun = 0;
    this.quietRun = 0;
  }
}
