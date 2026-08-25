import { Endpointer, NoiseFloor, pcm16, rms } from '../audioFeatures';

/** Feed a run of identical energies, collecting every event that fires. */
function run(ep: Endpointer, energy: number, frames: number): Array<string | null> {
  const out: Array<string | null> = [];
  for (let i = 0; i < frames; i += 1) out.push(ep.push(energy));
  return out;
}

const QUIET = 0.001;
const LOUD = 0.2;

describe('pcm16', () => {
  it('reads little-endian 16-bit samples', () => {
    // -1, 1, 256
    const bytes = new Uint8Array([0xff, 0xff, 0x01, 0x00, 0x00, 0x01]);
    expect(Array.from(pcm16(bytes))).toEqual([-1, 1, 256]);
  });

  it('copies rather than throwing when the buffer is oddly aligned', () => {
    const backing = new Uint8Array([0x00, 0xff, 0xff, 0x01, 0x00]);
    const odd = backing.subarray(1); // byteOffset 1 — unaligned for Int16Array
    expect(Array.from(pcm16(odd))).toEqual([-1, 1]);
  });
});

describe('rms', () => {
  it('is zero for silence and for an empty frame', () => {
    expect(rms(new Int16Array(64))).toBe(0);
    expect(rms(new Int16Array(0))).toBe(0);
  });

  it('rises with amplitude', () => {
    const quiet = new Int16Array(64).fill(100);
    const loud = new Int16Array(64).fill(10000);
    expect(rms(loud)).toBeGreaterThan(rms(quiet));
  });

  it('normalises full scale to about 1', () => {
    expect(rms(new Int16Array(64).fill(32767))).toBeCloseTo(1, 2);
  });
});

describe('NoiseFloor', () => {
  it('adopts the first frame outright', () => {
    expect(new NoiseFloor().update(0.05)).toBeCloseTo(0.05, 6);
  });

  it('falls towards quiet faster than it rises towards loud', () => {
    // Both start 0.1 away from their target, so the distance covered in one
    // step is directly comparable.
    const falling = new NoiseFloor();
    falling.update(0.1);
    const dropped = 0.1 - falling.update(0);

    const rising = new NoiseFloor();
    rising.update(0);
    const rose = rising.update(0.1) - 0;

    expect(dropped).toBeGreaterThan(rose);
  });

  it('reports null before any frame and forgets on reset', () => {
    const floor = new NoiseFloor();
    expect(floor.level).toBeNull();
    floor.update(0.2);
    expect(floor.level).not.toBeNull();
    floor.reset();
    expect(floor.level).toBeNull();
  });
});

describe('Endpointer', () => {
  it('fires speech-start only after enough consecutive loud frames', () => {
    const ep = new Endpointer({ startFrames: 3, endFrames: 4 });
    run(ep, QUIET, 10);
    expect(ep.push(LOUD)).toBeNull();
    expect(ep.push(LOUD)).toBeNull();
    expect(ep.push(LOUD)).toBe('speech-start');
    expect(ep.isSpeaking).toBe(true);
  });

  it('ignores a single loud frame — a click is not an utterance', () => {
    const ep = new Endpointer({ startFrames: 3, endFrames: 4 });
    run(ep, QUIET, 10);
    expect(ep.push(LOUD)).toBeNull();
    expect(run(ep, QUIET, 6)).toEqual([null, null, null, null, null, null]);
    expect(ep.isSpeaking).toBe(false);
  });

  it('fires speech-end only after the full hang-over', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 4 });
    run(ep, QUIET, 10);
    run(ep, LOUD, 2);
    expect(ep.isSpeaking).toBe(true);
    expect(ep.push(QUIET)).toBeNull();
    expect(ep.push(QUIET)).toBeNull();
    expect(ep.push(QUIET)).toBeNull();
    expect(ep.push(QUIET)).toBe('speech-end');
    expect(ep.isSpeaking).toBe(false);
  });

  // The reason endFrames exists at all.
  it('does not end an utterance on the pause between two words', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 6 });
    run(ep, QUIET, 10);
    run(ep, LOUD, 3);
    run(ep, QUIET, 3); // a short gap, shorter than the hang-over
    run(ep, LOUD, 3);
    expect(ep.isSpeaking).toBe(true);
  });

  // The reason the floor is frozen while speaking.
  it('does not let a long utterance raise the floor above itself', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 5 });
    run(ep, QUIET, 20);
    run(ep, LOUD, 2);
    expect(ep.isSpeaking).toBe(true);
    // Sustained speech for several seconds at 100 fps.
    run(ep, LOUD, 400);
    expect(ep.isSpeaking).toBe(true);
  });

  it('adapts to a noisy room instead of hearing speech in it', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 5, threshold: 3.5 });
    // A steady hum well above minEnergy — must NOT read as speech.
    const events = run(ep, 0.02, 50);
    expect(events.every((e) => e === null)).toBe(true);
    expect(ep.isSpeaking).toBe(false);
    // Actual speech over that hum still registers.
    run(ep, 0.2, 3);
    expect(ep.isSpeaking).toBe(true);
  });

  it('treats near-silence as quiet however low the floor drops', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 5, minEnergy: 0.006 });
    run(ep, 0, 50); // floor collapses to ~0
    const events = run(ep, 0.001, 20); // still inaudible
    expect(events.every((e) => e === null)).toBe(true);
    expect(ep.isSpeaking).toBe(false);
  });

  it('forgets everything on reset', () => {
    const ep = new Endpointer({ startFrames: 2, endFrames: 5 });
    run(ep, QUIET, 10);
    run(ep, LOUD, 2);
    expect(ep.isSpeaking).toBe(true);
    ep.reset();
    expect(ep.isSpeaking).toBe(false);
  });
});
