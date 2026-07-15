// Local-timezone day helpers. day_key is always 'YYYY-MM-DD' in device local time.

const pad = (n: number) => String(n).padStart(2, '0');

/** Derive a 'YYYY-MM-DD' day_key from a Date, in local time. */
export function dayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** day_key for a unix-ms timestamp. */
export function dayKeyFromMs(ms: number): string {
  return dayKeyFromDate(new Date(ms));
}

/** Today's day_key in local time. */
export function todayKey(): string {
  return dayKeyFromDate(new Date());
}

/** Local Date (midnight) for a 'YYYY-MM-DD' key. */
export function dateFromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a day_key by n days (may be negative). */
export function addDaysToKey(key: string, n: number): string {
  const d = dateFromDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKeyFromDate(d);
}

/** Whole-day difference b - a (in days). */
export function dayDiff(a: string, b: string): number {
  const ms = dateFromDayKey(b).getTime() - dateFromDayKey(a).getTime();
  return Math.round(ms / 86400000);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Human day header, e.g. "Today", "Yesterday", or "Mon, Jul 14 2026". */
export function formatDayHeader(key: string): string {
  const diff = dayDiff(key, todayKey());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const d = dateFromDayKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

/** Clock time from unix ms, e.g. "3:07 PM". */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Absolute stamp for Flop's updated_at, e.g. "Jul 14 2026 · 3:07 PM". Flop notes
 * carry no day_key, so they get a plain timestamp rather than a day header.
 */
export function formatFlopStamp(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} · ${formatClock(ms)}`;
}

/** ms duration -> "M:SS". */
export function formatDuration(ms: number | null | undefined): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${pad(s)}`;
}
