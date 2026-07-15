import { countNotes, createNote } from './notes';
import { countFlopNotes, createFlopNote } from './flopNotes';

// Dev-only seed data. Spreads a handful of text notes across several days so the
// Feed / Flip / View-All screens have something to render. No-ops if data exists.
const DAY = 86400000;

export async function seedIfEmpty(): Promise<boolean> {
  const seededNotes = (await countNotes()) === 0;
  if (seededNotes) await seed();
  // Flop has its own table and its own emptiness — seed it independently.
  if ((await countFlopNotes()) === 0) await seedFlop();
  return seededNotes;
}

/** A small argument tree, so the Flop tab has structure to render in dev. */
async function seedFlop(): Promise<void> {
  const root = await createFlopNote({
    relation: 'root',
    type: 'text',
    content:
      'Should the notebook stay offline-only?\n' +
      'Sync is the obvious next feature, but every note living on one device is ' +
      'the reason this thing feels private enough to write in honestly.',
  });
  const support = await createFlopNote({
    parent_id: root.id,
    relation: 'support',
    type: 'text',
    content: 'No server means no breach\nThere is nothing to leak if nothing leaves the phone.',
  });
  await createFlopNote({
    parent_id: support.id,
    relation: 'oppose',
    type: 'text',
    content: 'A lost phone loses everything\nWithout sync, a cracked screen is a deleted journal.',
  });
  await createFlopNote({
    parent_id: root.id,
    relation: 'idea',
    type: 'text',
    content: 'Export to a file instead\nBackup without a server: the user carries their own copy.',
  });
  await createFlopNote({
    parent_id: root.id,
    relation: 'oppose',
    type: 'text',
    content: 'One device is a real limit\nNotes taken on a laptop never make it in.',
  });
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
