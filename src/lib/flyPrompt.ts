// Building the clipboard payload that turns a Fly day into a story.
//
// Kept apart from the database module so it stays pure and testable, for the
// same reason lib/notedUpdates.ts is: this is the bit whose exact output
// matters, because it lands in a prompt.
//
// The story itself is generated outside the app. DayFeed is offline by
// identity, and bundling a language model would add most of a gigabyte to an
// APK that already carries a 148MB whisper model — for prose a model that size
// writes badly. So Fly copies the day out, you paste it into a Claude session,
// and you paste the story back.
import type { FlyNote } from '../db/flyTypes';
import { formatClock, formatDayLong } from '../utils/date';

/**
 * The engine prompt. Editable in the Fly prompt sheet (settings key
 * `fly.prompt`); this is the default and the Reset target.
 *
 * The last line matters more than it looks: without it a model will happily
 * invent a lunch you never mentioned to make the narrative flow, and a journal
 * you can't trust is worse than no journal.
 */
export const DEFAULT_FLY_PROMPT = `Create a daily journal story from the following notes and timestamps, describing how the day progressed. Write it as continuous prose in the first person, past tense. Use the timestamps for ordering and time-of-day context, but do not list them. Do not invent events that are not in the notes.`;

/** A voice memo with no transcript yet — nothing of it can reach the story. */
export function untranscribedCount(notes: FlyNote[]): number {
  return notes.filter((n) => n.type === 'voice' && !n.transcript?.trim()).length;
}

/** The text of an entry, or null if there is nothing to say yet. */
function entryText(note: FlyNote): string | null {
  const raw = note.type === 'voice' ? note.transcript : note.content;
  const text = raw?.trim();
  return text ? text : null;
}

/**
 * Render a day as prompt + timestamped entries, ready to paste into a session.
 *
 * Entries with no text are skipped rather than emitted as empty lines: an
 * untranscribed memo contributes nothing, and a blank `9:15` in the list reads
 * to a model like a moment that mattered but wasn't described.
 *
 * Continuation lines are indented under the first, so a multi-line note stays
 * one entry instead of dissolving into the next — the same reason
 * notedUpdatesToClipboard indents.
 */
export function buildFlyClipboard(
  prompt: string,
  dayKey: string,
  notes: FlyNote[],
): string {
  const lines = notes
    .map((n) => {
      const text = entryText(n);
      if (!text) return null;
      const stamp = formatClock(n.created_at);
      const marker = n.type === 'voice' ? `${stamp}  [voice] ` : `${stamp}  `;
      const indent = ' '.repeat(stamp.length + 2);
      const [first, ...rest] = text.split('\n');
      const body = rest.map((line) => (line.trim() ? indent + line.trim() : ''));
      return [marker + first, ...body].join('\n');
    })
    .filter((l): l is string => l !== null);

  // Absolute, never "Today": this text is pasted elsewhere and may be read days
  // later. formatDayLong exists for exactly that reason.
  const header = `${formatDayLong(dayKey)} (${dayKey})`;
  return `${prompt.trim()}\n\n${header}\n\n${lines.join('\n')}\n`;
}
