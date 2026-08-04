import { BASE_RADIUS, radialSlots, radiusForCount, SWEEP_DEGREES } from '../radialLayout';

const R = 110;

describe('radialSlots', () => {
  it('returns one slot per action, and nothing for an empty menu', () => {
    expect(radialSlots(0, 'left', R)).toEqual([]);
    expect(radialSlots(1, 'left', R)).toHaveLength(1);
    expect(radialSlots(4, 'left', R)).toHaveLength(4);
    expect(radialSlots(6, 'left', R)).toHaveLength(6);
  });

  it('puts a lone action level with the anchor', () => {
    const [only] = radialSlots(1, 'left', R);
    expect(only.angle).toBe(0);
    expect(only.x).toBeCloseTo(R);
    expect(only.y).toBeCloseTo(0);
  });

  it('spans the full sweep, ends first and last', () => {
    const slots = radialSlots(4, 'left', R);
    expect(slots[0].angle).toBeCloseTo(-SWEEP_DEGREES);
    expect(slots[slots.length - 1].angle).toBeCloseTo(SWEEP_DEGREES);
  });

  it('never exceeds the sweep, so no pill lands above or below the anchor', () => {
    for (const count of [1, 2, 4, 6]) {
      for (const slot of radialSlots(count, 'left', R)) {
        expect(Math.abs(slot.angle)).toBeLessThanOrEqual(SWEEP_DEGREES);
      }
    }
  });

  it('spaces actions evenly along the arc', () => {
    const angles = radialSlots(5, 'left', R).map((s) => s.angle);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0]);
    }
  });

  it('keeps every slot on the radius', () => {
    for (const slot of radialSlots(6, 'left', R)) {
      expect(Math.hypot(slot.x, slot.y)).toBeCloseTo(R);
    }
  });

  it('mirrors horizontally for the right anchor, so both arcs open inward', () => {
    const left = radialSlots(4, 'left', R);
    const right = radialSlots(4, 'right', R);

    left.forEach((slot, i) => {
      expect(right[i].x).toBeCloseTo(-slot.x);
      expect(right[i].y).toBeCloseTo(slot.y);
      expect(right[i].angle).toBeCloseTo(slot.angle);
    });

    expect(left.every((s) => s.x > 0)).toBe(true);
    expect(right.every((s) => s.x < 0)).toBe(true);
  });
});

describe('radiusForCount', () => {
  // The Expire action took Feed's menu from four pills to five. At the old
  // fixed radius the outer pills sat 37dp apart while a pill is 40dp tall, so
  // they overlapped — this is that regression, pinned.
  const PILL_HEIGHT = 40;

  function smallestGap(count: number): number {
    const slots = radialSlots(count, 'left', radiusForCount(count));
    let min = Infinity;
    for (let i = 1; i < slots.length; i++) {
      min = Math.min(min, Math.abs(slots[i].y - slots[i - 1].y));
    }
    return min;
  }

  it('leaves existing menus untouched', () => {
    for (const count of [1, 2, 3, 4]) {
      expect(radiusForCount(count)).toBe(BASE_RADIUS);
    }
  });

  it('never lets adjacent pills overlap, however many there are', () => {
    for (let count = 2; count <= 8; count++) {
      expect(smallestGap(count)).toBeGreaterThanOrEqual(PILL_HEIGHT);
    }
  });

  it('grows the arc once five pills no longer fit', () => {
    expect(radiusForCount(5)).toBeGreaterThan(BASE_RADIUS);
  });

  it('never shrinks as pills are added', () => {
    for (let count = 2; count <= 8; count++) {
      expect(radiusForCount(count + 1)).toBeGreaterThanOrEqual(radiusForCount(count));
    }
  });
});
