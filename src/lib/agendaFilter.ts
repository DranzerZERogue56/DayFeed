// Filters for the Agenda: what is still outstanding, and when.
//
// Agenda rows are keyed by 'YYYY-MM-DD' (see dayKeyFromMs in utils/date.ts),
// and that format sorts and compares correctly as a plain string — so the time
// windows are string comparisons rather than Date arithmetic, with no timezone
// or DST edge cases to get wrong.
import { addDaysToKey } from '../utils/date';

export type AgendaFilter = 'new' | 'today' | 'week' | 'upcoming' | 'done';

export const AGENDA_FILTERS: { key: AgendaFilter; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'upcoming', label: 'Upcoming' },
  // "Done" rather than "Completed" so all five chips fit one row without
  // scrolling — a chip hidden off-screen is a chip nobody finds.
  { key: 'done', label: 'Done' },
];

/** Last day of the 'week' window: today plus six, i.e. seven days inclusive. */
export const WEEK_SPAN_DAYS = 6;

/** The parts of an agenda entry the filters actually look at. */
export interface AgendaFilterable {
  date_key: string;
  completed_at: number | null;
}

/**
 * Whether an entry belongs in the given filter.
 *
 * Completion outranks time: every window except 'done' shows only what is
 * still outstanding, so ticking something off takes it out of Today and Week
 * as well as New. Otherwise a finished item would keep occupying the view it
 * was finished in.
 *
 * 'week' is a rolling seven days from today rather than a calendar week, so it
 * always shows a full week of runway instead of collapsing to a single day by
 * Saturday. Both 'week' and 'upcoming' start at today — a date already gone by
 * is not something still ahead of you.
 */
export function matchesAgendaFilter(
  entry: AgendaFilterable,
  filter: AgendaFilter,
  today: string,
): boolean {
  const done = entry.completed_at != null;
  if (filter === 'done') return done;
  if (done) return false;

  switch (filter) {
    case 'new':
      return true;
    case 'today':
      return entry.date_key === today;
    case 'week':
      return entry.date_key >= today && entry.date_key <= addDaysToKey(today, WEEK_SPAN_DAYS);
    case 'upcoming':
      return entry.date_key >= today;
  }
}

/** What to say when a filter turns up nothing — each is empty for its own reason. */
export function emptyAgendaHint(filter: AgendaFilter): { title: string; hint: string } {
  switch (filter) {
    case 'new':
      return {
        title: 'Nothing outstanding.',
        hint: 'Mention a date in a note — like “call Sam next Friday” — and it shows up here.',
      };
    case 'today':
      return { title: 'Nothing due today.', hint: 'Tap New to see everything outstanding.' };
    case 'week':
      return {
        title: 'Nothing in the next seven days.',
        hint: 'Tap Upcoming to see what comes after that.',
      };
    case 'upcoming':
      return {
        title: 'Nothing ahead.',
        hint: 'Every outstanding date has already passed. Tap New to see them.',
      };
    case 'done':
      return {
        title: 'Nothing ticked off yet.',
        hint: 'Tap the circle on an entry to mark it done.',
      };
  }
}
