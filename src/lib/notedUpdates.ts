// Formatting the Noted-updates list for the clipboard.
//
// Kept apart from the database module so it stays pure and testable: this is
// the bit whose exact output matters, since it lands in a prompt.
import type { NotedUpdate } from '../db/notedUpdates';

/** Width of "12. " — the widest marker before the list would need rethinking. */
const INDENT = '   ';

/**
 * Render the updates as a numbered list for pasting into a prompt.
 *
 * Continuation lines are indented to sit under the first line's text, so a
 * multi-line update reads as one item rather than dissolving into the next.
 * Numbering makes it possible to say "do 2 and 4" instead of quoting them
 * back — the reason a plain blank-line-separated dump wasn't enough.
 */
export function notedUpdatesToClipboard(updates: NotedUpdate[]): string {
  return updates
    .map((u, i) => {
      const marker = `${i + 1}. `;
      const [first, ...rest] = u.content.trim().split('\n');
      const body = rest.map((line) => (line.trim() ? INDENT + line : line));
      return [marker + first, ...body].join('\n');
    })
    .join('\n\n');
}
