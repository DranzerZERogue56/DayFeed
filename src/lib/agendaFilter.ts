// Time-window filters for the Agenda.
//
// Agenda rows are keyed by 'YYYY-MM-DD' (see dayKeyFromMs in utils/date.ts),
// and that format sorts and compares correctly as a plain string — so the
// windows are string comparisons rather than Date arithmetic, with no timezone
// or DST edge cases to get wrong.
import { addDaysToKey } from '../utils/date';

export type AgendaFilter = 'all' | 'today' | 'week' | 'upcoming';

export const AGENDA_FILTERS: { key: AgendaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'upcoming', label: 'Upcoming' },
];

/** Last day of the 'week' window: today plus six, i.e. seven days inclusive. */
export const WEEK_SPAN_DAYS = 6;

/**
 * Whether a day belongs in the given window.
 *
 * 'week' is a rolling seven days from today rather than a calendar week, so it
 * always shows a full week of runway instead of collapsing to a single day by
 * Saturday. Both 'week' and 'upcoming' start at today — a date that has already
 * gone by is not something still ahead of you.
 */
export function matchesAgendaFilter(
  dateKey: string,
  filter: AgendaFilter,
  today: string,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return dateKey === today;
    case 'week':
      return dateKey >= today && dateKey <= addDaysToKey(today, WEEK_SPAN_DAYS);
    case 'upcoming':
      return dateKey >= today;
  }
}

/** What to say when a window turns up nothing — each is empty for its own reason. */
export function emptyAgendaHint(filter: AgendaFilter): { title: string; hint: string } {
  switch (filter) {
    case 'all':
      return {
        title: 'No upcoming dates yet.',
        hint: 'Mention a date in a note — like “call Sam next Friday” — and it shows up here.',
      };
    case 'today':
      return { title: 'Nothing due today.', hint: 'Tap All to see everything on the calendar.' };
    case 'week':
      return {
        title: 'Nothing in the next seven days.',
        hint: 'Tap Upcoming to see what comes after that.',
      };
    case 'upcoming':
      return {
        title: 'Nothing ahead.',
        hint: 'Every date found in your notes has already passed. Tap All to see them.',
      };
  }
}
