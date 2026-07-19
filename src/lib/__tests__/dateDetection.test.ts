import { detectDates } from '../dateDetection';
import { dayKeyFromMs } from '../../utils/date';

// Sunday, July 19 2026, noon local — a fixed reference for every case.
const REF = new Date(2026, 6, 19, 12, 0).getTime();
const REF_KEY = dayKeyFromMs(REF);

describe('detectDates', () => {
  it('returns nothing for empty or whitespace text', () => {
    expect(detectDates('', REF)).toEqual([]);
    expect(detectDates('   ', REF)).toEqual([]);
  });

  it('detects an explicit future date with a contextual snippet', () => {
    const out = detectDates('dentist appointment on August 2', REF);
    expect(out).toHaveLength(1);
    expect(out[0].date_key).toBe('2026-08-02');
    expect(out[0].snippet).toContain('dentist appointment');
  });

  it('resolves relative phrases against the reference day', () => {
    const out = detectDates('project due tomorrow', REF);
    expect(out).toHaveLength(1);
    expect(out[0].date_key).toBe('2026-07-20');
  });

  it('keeps today, drops purely past dates', () => {
    expect(detectDates('it happened on July 3', REF)).toEqual([]);
    const today = detectDates('finish this today', REF);
    expect(today).toHaveLength(1);
    expect(today[0].date_key).toBe(REF_KEY);
  });

  it('ignores pure time mentions with no date component', () => {
    expect(detectDates('call the bank at 3pm', REF)).toEqual([]);
  });

  it('detects multiple dates in one note', () => {
    const out = detectDates('review on July 25 and ship on August 1', REF);
    expect(out.map((d) => d.date_key)).toEqual(['2026-07-25', '2026-08-01']);
  });

  it('caps long snippets and marks trimmed leading context', () => {
    const lead = 'a very long preamble that keeps going and going and definitely exceeds the lead window ';
    const out = detectDates(`${lead}meeting on July 30`, REF);
    expect(out).toHaveLength(1);
    expect(out[0].snippet.length).toBeLessThanOrEqual(90);
    expect(out[0].snippet.startsWith('…')).toBe(true);
  });
});
