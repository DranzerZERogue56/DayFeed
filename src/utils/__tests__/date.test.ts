import {
  addDaysToKey,
  dateFromDayKey,
  dayDiff,
  dayKeyFromDate,
  dayKeyFromMs,
  formatClock,
  formatDayHeader,
  formatDuration,
  formatFlopStamp,
  todayKey,
} from '../date';

describe('day keys', () => {
  it('derives YYYY-MM-DD in local time with zero padding', () => {
    expect(dayKeyFromDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKeyFromDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('round-trips through dateFromDayKey', () => {
    const key = '2026-07-19';
    expect(dayKeyFromDate(dateFromDayKey(key))).toBe(key);
  });

  it('dayKeyFromMs matches dayKeyFromDate for the same instant', () => {
    const d = new Date(2026, 6, 19, 15, 30);
    expect(dayKeyFromMs(d.getTime())).toBe(dayKeyFromDate(d));
  });
});

describe('addDaysToKey / dayDiff', () => {
  it('shifts forward and backward, crossing month boundaries', () => {
    expect(addDaysToKey('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses a DST boundary without drifting a day', () => {
    // US spring-forward 2026 is March 8.
    expect(addDaysToKey('2026-03-07', 2)).toBe('2026-03-09');
    expect(dayDiff('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('dayDiff is signed (b - a)', () => {
    expect(dayDiff('2026-07-19', '2026-07-21')).toBe(2);
    expect(dayDiff('2026-07-21', '2026-07-19')).toBe(-2);
    expect(dayDiff('2026-07-19', '2026-07-19')).toBe(0);
  });
});

describe('formatDayHeader', () => {
  it('labels today, yesterday and tomorrow relative to now', () => {
    const today = todayKey();
    expect(formatDayHeader(today)).toBe('Today');
    expect(formatDayHeader(addDaysToKey(today, -1))).toBe('Yesterday');
    expect(formatDayHeader(addDaysToKey(today, 1))).toBe('Tomorrow');
  });

  it('formats other days as "Www, Mmm D YYYY"', () => {
    // 2026-01-05 is a Monday.
    expect(formatDayHeader('2026-01-05')).toBe('Mon, Jan 5 2026');
  });
});

describe('clock and duration formatting', () => {
  it('formats 12-hour clock with AM/PM and midnight/noon as 12', () => {
    expect(formatClock(new Date(2026, 6, 19, 0, 7).getTime())).toBe('12:07 AM');
    expect(formatClock(new Date(2026, 6, 19, 12, 0).getTime())).toBe('12:00 PM');
    expect(formatClock(new Date(2026, 6, 19, 15, 7).getTime())).toBe('3:07 PM');
  });

  it('formats the Flop stamp as "Mmm D YYYY · clock"', () => {
    expect(formatFlopStamp(new Date(2026, 6, 14, 15, 7).getTime())).toBe('Jul 14 2026 · 3:07 PM');
  });

  it('formats durations as M:SS, clamping null/negative to 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(999)).toBe('0:01');
    expect(formatDuration(61_000)).toBe('1:01');
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(-5000)).toBe('0:00');
  });
});
