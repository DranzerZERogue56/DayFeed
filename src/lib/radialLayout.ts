// Geometry for the radial long-press menu: where each action pill sits on the
// arc around its anchor button. Pure math, no rendering (see
// RadialActionsMenu.tsx), so the layout can be tested without a renderer.

export interface RadialSlot {
  /** Horizontal offset from the anchor's centre, in dp. */
  x: number;
  /** Vertical offset from the anchor's centre, in dp. Negative is up. */
  y: number;
  /** Position on the arc in degrees; 0 is level with the anchor. */
  angle: number;
}

/**
 * The arc stops short of a true half-circle. At ±90° the end pills would sit
 * directly above and below the anchor, which reads as a vertical stack rather
 * than a fan and puts them where a thumb pivoting from the anchor can't
 * comfortably reach.
 */
export const SWEEP_DEGREES = 80;

/** The radius the arc used when every menu had four actions or fewer. */
export const BASE_RADIUS = 108;

/** Pill height and the clear space wanted between two adjacent pills, in dp. */
const PILL_HEIGHT = 40;
const MIN_GAP = PILL_HEIGHT + 8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Radius that keeps `count` pills from colliding.
 *
 * Pills are spread by angle, so their vertical spacing is `radius × Δsin`, and
 * Δsin is smallest at the ends of the arc where the fan flattens out. At the
 * fixed 108 that served four actions, five put the outer pairs 37dp apart —
 * closer than a pill is tall, so they overlapped. This grows the arc just
 * enough, and never shrinks below the original, so existing menus are
 * pixel-identical.
 */
export function radiusForCount(count: number): number {
  if (count < 2) return BASE_RADIUS;

  const step = (SWEEP_DEGREES * 2) / (count - 1);
  let needed = BASE_RADIUS;

  for (let i = 0; i < count - 1; i++) {
    const a = -SWEEP_DEGREES + i * step;
    const b = a + step;
    const spread = Math.abs(Math.sin(toRadians(b)) - Math.sin(toRadians(a)));
    // Two pills at the same angle can never be separated by any radius.
    if (spread > 0) needed = Math.max(needed, MIN_GAP / spread);
  }

  return Math.ceil(needed);
}

/**
 * Spread `count` items evenly across the arc centred on the anchor, as offsets
 * from the anchor's centre. A left anchor opens rightward (positive x); a right
 * anchor mirrors it so both fan toward the middle of the screen.
 *
 * A lone item sits at 0°, level with the anchor, rather than at the top of the
 * sweep.
 */
export function radialSlots(
  count: number,
  side: 'left' | 'right',
  radius: number,
): RadialSlot[] {
  if (count <= 0) return [];

  const direction = side === 'left' ? 1 : -1;
  const step = count === 1 ? 0 : (SWEEP_DEGREES * 2) / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1 ? 0 : -SWEEP_DEGREES + i * step;
    const radians = toRadians(angle);
    return {
      x: direction * radius * Math.cos(radians),
      y: radius * Math.sin(radians),
      angle,
    };
  });
}
