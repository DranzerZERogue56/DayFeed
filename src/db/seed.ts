import { countNotes, createNote } from './notes';

// Dev-only seed data. Spreads a handful of text notes across several days so the
// Feed / Flip / View-All screens have something to render. No-ops if data exists.
const DAY = 86400000;

export async function seedIfEmpty(): Promise<boolean> {
  if ((await countNotes()) > 0) return false;
  await seed();
  return true;
}

export async function seed(): Promise<void> {
  const now = Date.now();
  const samples: { content: string; daysAgo: number; minute: number }[] = [
    { content: 'Welcome to DayFeed — jot anything here.', daysAgo: 2, minute: 8 * 60 + 15 },
    { content: 'Bought coffee beans and oat milk.', daysAgo: 2, minute: 9 * 60 + 2 },
    { content: 'Idea: notebook-style flip view for each day.', daysAgo: 2, minute: 21 * 60 },
    { content: 'Gym: legs + 20 min bike.', daysAgo: 1, minute: 7 * 60 + 30 },
    { content: 'Call the dentist to reschedule.', daysAgo: 1, minute: 13 * 60 + 45 },
    { content: 'Finished the first draft of the proposal.', daysAgo: 0, minute: 10 * 60 + 5 },
    { content: 'Lunch with Sam downtown.', daysAgo: 0, minute: 12 * 60 + 30 },
  ];

  for (const s of samples) {
    const midnight = new Date(now - s.daysAgo * DAY);
    midnight.setHours(0, 0, 0, 0);
    const created_at = midnight.getTime() + s.minute * 60000;
    await createNote({ type: 'text', content: s.content, created_at });
  }
}
