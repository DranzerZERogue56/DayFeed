import { expiryForDay, isExpired, isExpiring, msUntilNextExpiry } from '../expiry';

/** Local-time timestamp, so the tests read the same way the app computes. */
function at(y: number, m: number, d: number, hh: number, mm: number): number {
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

describe('expiryForDay', () => {
  it('lands on 23:59 the same day for a morning timestamp', () => {
    const e = new Date(expiryForDay(at(2026, 8, 4, 9, 15)));
    expect([e.getFullYear(), e.getMonth() + 1, e.getDate()]).toEqual([2026, 8, 4]);
    expect([e.getHours(), e.getMinutes()]).toEqual([23, 59]);
  });

  it('does not roll to tomorrow for a late-evening timestamp', () => {
    const e = new Date(expiryForDay(at(2026, 8, 4, 23, 58)));
    expect(e.getDate()).toBe(4);
    expect([e.getHours(), e.getMinutes()]).toEqual([23, 59]);
  });

  it('zeroes seconds and milliseconds', () => {
    const e = new Date(expiryForDay(at(2026, 8, 4, 12, 0) + 12_345));
    expect(e.getSeconds()).toBe(0);
    expect(e.getMilliseconds()).toBe(0);
  });

  it('is the same instant whatever time of day it is asked', () => {
    expect(expiryForDay(at(2026, 8, 4, 0, 1))).toBe(expiryForDay(at(2026, 8, 4, 22, 0)));
  });
});

describe('msUntilNextExpiry', () => {
  it('counts down to tonight when the deadline is still ahead', () => {
    const now = at(2026, 8, 4, 23, 0);
    expect(msUntilNextExpiry(now)).toBe(59 * 60 * 1000);
  });

  it('rolls to tomorrow once tonight has passed', () => {
    // 23:59:30 — today's deadline is behind us by half a minute.
    const now = at(2026, 8, 4, 23, 59) + 30_000;
    const ms = msUntilNextExpiry(now);
    expect(new Date(now + ms).getDate()).toBe(5);
  });

  it('is always positive and within a day', () => {
    for (const now of [at(2026, 8, 4, 0, 0), at(2026, 8, 4, 12, 0), at(2026, 8, 4, 23, 59)]) {
      const ms = msUntilNextExpiry(now);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }
  });
});

describe('isExpiring / isExpired', () => {
  it('an untagged note is neither', () => {
    expect(isExpiring({ expires_at: null })).toBe(false);
    expect(isExpired({ expires_at: null }, Date.now())).toBe(false);
  });

  it('a tagged note is expiring before its deadline but not yet expired', () => {
    const deadline = at(2026, 8, 4, 23, 59);
    expect(isExpiring({ expires_at: deadline })).toBe(true);
    expect(isExpired({ expires_at: deadline }, at(2026, 8, 4, 20, 0))).toBe(false);
  });

  it('expires at the deadline itself, not a moment later', () => {
    const deadline = at(2026, 8, 4, 23, 59);
    expect(isExpired({ expires_at: deadline }, deadline)).toBe(true);
  });
});
