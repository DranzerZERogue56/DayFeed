// Geometry and timing for the animated launch screen.
//
// Kept out of the component so the fiddly arithmetic is testable: a circle that
// is one pixel too small leaves the screen's corners uncovered, and that is not
// something a unit test of the component would catch.
import { darkColors, lightColors } from '../theme';

/**
 * The launch background, matching the native splash screen's colour exactly.
 *
 * Deliberately a literal rather than `colors.bg` from the active theme: the
 * native splash underneath is hardcoded cream by the Expo config, so a themed
 * value would flash bright-then-dark on a dark-mode launch — the very thing
 * this screen exists to remove.
 */
export const BOOT_BG = lightColors.bg;

/** One hue deepening — pale bronze through to the dark theme's leather. */
export const SPLASH_COLORS = [
  '#E8D5BC', // pale bronze
  '#C89B66', // bright bronze (dark theme accent)
  '#A67C52', // accent bronze
  '#8B6B42', // dark bronze
  '#3D2F20', // warm dark (dark theme divider)
  darkColors.bg, // deep coffee — the colour the cover opens from
] as const;

/** What the screen is filled with when the cover opens. */
export const FINAL_COLOR = SPLASH_COLORS[SPLASH_COLORS.length - 1];

// One block so the pacing can be tuned in a single place after seeing it run.
export const RING_MS = 380; // one colour's expansion
export const RING_STAGGER_MS = 60; // gap between successive colours
export const HOLD_MS = 100; // beat on full dark before opening
export const SPLIT_MS = 380; // the cover sweeping aside
/**
 * Floor on the loading ring's visible time.
 *
 * `initDb()` on a warm start finishes in a few milliseconds, and a ring that
 * appears for a single frame reads as a glitch rather than a loading state.
 */
export const MIN_SPINNER_MS = 400;

/**
 * Radius a centred circle needs to cover the whole screen.
 *
 * The half-diagonal, not `max(width, height) / 2` — on a tall phone the latter
 * reaches the top and bottom edges while leaving the corners unpainted.
 */
export function coverRadius(width: number, height: number): number {
  return Math.hypot(width, height) / 2;
}

/** Start delay for ring `index`, so the colours splash out one after another. */
export function ringDelay(index: number): number {
  return index * RING_STAGGER_MS;
}

/** How long the whole sequence takes once the data is ready. */
export function splashDuration(ringCount: number = SPLASH_COLORS.length): number {
  return ringDelay(ringCount - 1) + RING_MS + HOLD_MS + SPLIT_MS;
}
