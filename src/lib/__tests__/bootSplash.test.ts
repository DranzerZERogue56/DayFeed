import {
  BOOT_BG,
  FINAL_COLOR,
  RING_MS,
  RING_STAGGER_MS,
  SPLASH_COLORS,
  WATCHDOG_MS,
  coverRadius,
  ringDelay,
  splashDuration,
} from '../bootSplash';
import { darkColors, lightColors } from '../../theme';

describe('coverRadius', () => {
  it('is the half-diagonal', () => {
    // 3-4-5: half of the 5 diagonal.
    expect(coverRadius(6, 8)).toBe(5);
  });

  it('reaches the corners of a tall portrait screen', () => {
    const [w, h] = [412, 915];
    const r = coverRadius(w, h);
    // Distance from the centre to a corner must be covered.
    expect(r).toBeGreaterThanOrEqual(Math.hypot(w / 2, h / 2));
  });

  it('is bigger than half the longest side, which would miss the corners', () => {
    expect(coverRadius(412, 915)).toBeGreaterThan(915 / 2);
  });

  it('handles a square', () => {
    expect(coverRadius(100, 100)).toBeCloseTo(70.71, 1);
  });
});

describe('ringDelay', () => {
  it('starts the first ring immediately', () => {
    expect(ringDelay(0)).toBe(0);
  });

  it('staggers each successive ring', () => {
    const delays = SPLASH_COLORS.map((_, i) => ringDelay(i));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('overlaps rings rather than queueing them end to end', () => {
    // A stagger longer than a ring's own animation would read as six separate
    // wipes instead of one splash.
    expect(RING_STAGGER_MS).toBeLessThan(RING_MS);
  });
});

describe('the palette', () => {
  // These tie the launch to the app's own colours. Without them a theme edit
  // could desynchronise the two and reintroduce a flash at the seam.
  it('ends on the colour the cover opens from', () => {
    expect(SPLASH_COLORS[SPLASH_COLORS.length - 1]).toBe(FINAL_COLOR);
  });

  it('finishes on the dark theme background, so dark mode reveals seamlessly', () => {
    expect(FINAL_COLOR).toBe(darkColors.bg);
  });

  it('starts on the light background, which is also the native splash colour', () => {
    expect(BOOT_BG).toBe(lightColors.bg);
  });

  it('has no repeated colours', () => {
    expect(new Set(SPLASH_COLORS).size).toBe(SPLASH_COLORS.length);
  });
});

describe('splashDuration', () => {
  it('covers the last ring, the hold, and the opening', () => {
    // The last ring must have finished expanding before the cover opens.
    expect(splashDuration()).toBeGreaterThan(ringDelay(SPLASH_COLORS.length - 1) + RING_MS);
  });

  it('stays under a second and a half, so launch does not drag', () => {
    expect(splashDuration()).toBeLessThan(1500);
  });
});

describe('WATCHDOG_MS', () => {
  it('leaves the full animation room to finish before firing', () => {
    // A backstop that fired mid-animation would cut the launch short every time.
    expect(WATCHDOG_MS).toBeGreaterThan(splashDuration());
  });

  it('still opens the app promptly if the animation never completes', () => {
    expect(WATCHDOG_MS).toBeLessThanOrEqual(5000);
  });
});
