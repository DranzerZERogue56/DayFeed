import {
  AGENDA_FILTERS,
  WEEK_SPAN_DAYS,
  emptyAgendaHint,
  matchesAgendaFilter,
  type AgendaFilter,
} from '../agendaFilter';

const TODAY = '2026-08-04';
const open = (date_key: string) => ({ date_key, completed_at: null });
const done = (date_key: string) => ({ date_key, completed_at: 1_700_000_000_000 });
const match = (dateKey: string, filter: AgendaFilter) =>
  matchesAgendaFilter(open(dateKey), filter, TODAY);

describe('new', () => {
  it('keeps every outstanding entry, however far past or future', () => {
    for (const key of ['2019-01-01', TODAY, '2099-12-31']) {
      expect(match(key, 'new')).toBe(true);
    }
  });

  it('drops anything ticked off', () => {
    expect(matchesAgendaFilter(done(TODAY), 'new', TODAY)).toBe(false);
  });
});

describe('done', () => {
  it('keeps only completed entries, whatever their date', () => {
    expect(matchesAgendaFilter(done('2019-01-01'), 'done', TODAY)).toBe(true);
    expect(matchesAgendaFilter(done('2099-12-31'), 'done', TODAY)).toBe(true);
    expect(matchesAgendaFilter(open(TODAY), 'done', TODAY)).toBe(false);
  });
});

describe('completion outranks the time windows', () => {
  // Ticking something off must take it out of Today and Week too, or a
  // finished item keeps occupying the view it was finished in.
  it('hides a completed entry from every window except done', () => {
    for (const filter of ['new', 'today', 'week', 'upcoming'] as AgendaFilter[]) {
      expect(matchesAgendaFilter(done(TODAY), filter, TODAY)).toBe(false);
    }
  });
});

describe('today', () => {
  it('keeps only today', () => {
    expect(match(TODAY, 'today')).toBe(true);
    expect(match('2026-08-03', 'today')).toBe(false);
    expect(match('2026-08-05', 'today')).toBe(false);
  });
});

describe('week', () => {
  it('includes today and the following six days', () => {
    expect(match(TODAY, 'week')).toBe(true);
    expect(match('2026-08-10', 'week')).toBe(true); // today + 6
  });

  it('stops after seven days', () => {
    expect(match('2026-08-11', 'week')).toBe(false);
  });

  it('excludes yesterday — a window of what is ahead, not around', () => {
    expect(match('2026-08-03', 'week')).toBe(false);
  });

  it('spans exactly seven days inclusive', () => {
    expect(WEEK_SPAN_DAYS).toBe(6);
  });

  it('crosses a month boundary', () => {
    // 2026-08-28 + 6 = 2026-09-03, so the window must reach into September.
    expect(matchesAgendaFilter(open('2026-09-03'), 'week', '2026-08-28')).toBe(true);
    expect(matchesAgendaFilter(open('2026-09-04'), 'week', '2026-08-28')).toBe(false);
  });

  it('crosses a year boundary', () => {
    expect(matchesAgendaFilter(open('2027-01-02'), 'week', '2026-12-30')).toBe(true);
  });
});

describe('upcoming', () => {
  it('keeps today and everything after it', () => {
    expect(match(TODAY, 'upcoming')).toBe(true);
    expect(match('2030-01-01', 'upcoming')).toBe(true);
  });

  it('drops anything already past', () => {
    expect(match('2026-08-03', 'upcoming')).toBe(false);
  });
});

describe('string comparison holds up', () => {
  it('orders single-digit months and days correctly', () => {
    // Zero-padding is what makes lexicographic comparison safe here; without
    // it '2026-9-01' would sort before '2026-10-01'.
    expect(matchesAgendaFilter(open('2026-09-01'), 'upcoming', '2026-10-01')).toBe(false);
    expect(matchesAgendaFilter(open('2026-10-01'), 'upcoming', '2026-09-01')).toBe(true);
  });
});

describe('empty hints', () => {
  it('gives every filter its own explanation', () => {
    const titles = AGENDA_FILTERS.map((f) => emptyAgendaHint(f.key).title);
    expect(new Set(titles).size).toBe(AGENDA_FILTERS.length);
  });

  it('points somewhere useful when a narrow window is empty', () => {
    expect(emptyAgendaHint('today').hint).toContain('New');
    expect(emptyAgendaHint('week').hint).toContain('Upcoming');
  });
});
