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

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

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
