// Lightweight, typed-as-you-go markdown for lists: "1. " -> numbered, "- " ->
// bullet, "[] " -> checkbox. Pure text transforms — no rendering here (see
// MarkdownText.tsx) and no live "rich" widgets while editing (RN's TextInput
// can't render those inline), just plain-text markers that a read-only view
// later recognizes and formats.

export type MarkdownLineType = 'plain' | 'ordered' | 'bullet' | 'checkbox';

export interface ParsedLine {
  type: MarkdownLineType;
  /** Text after the marker. */
  body: string;
  /** Ordered lines only — the number as typed. */
  order?: number;
  /** Checkbox lines only. */
  checked?: boolean;
}

const ORDERED_RE = /^(\d+)\.\s(.*)$/;
const BULLET_RE = /^-\s(.*)$/;
const CHECKBOX_RE = /^\[([ xX])\]\s(.*)$/;

function parseLine(line: string): ParsedLine {
  const ordered = line.match(ORDERED_RE);
  if (ordered) return { type: 'ordered', order: Number(ordered[1]), body: ordered[2] };

  const checkbox = line.match(CHECKBOX_RE);
  if (checkbox) return { type: 'checkbox', checked: checkbox[1] !== ' ', body: checkbox[2] };

  const bullet = line.match(BULLET_RE);
  if (bullet) return { type: 'bullet', body: bullet[1] };

  return { type: 'plain', body: line };
}

/** Split text into lines and classify each as plain/ordered/bullet/checkbox. */
export function parseMarkdownLines(text: string): ParsedLine[] {
  return text.split('\n').map(parseLine);
}

/**
 * Given the full text right after a `\n` was inserted at `cursor` (i.e.
 * text[cursor - 1] === '\n'), auto-continue the list the previous line
 * belonged to. Returns null if the previous line wasn't a list line.
 *
 * - Previous line has content -> insert the next marker at the cursor.
 * - Previous line is a bare marker (empty body) -> strip it, breaking out of
 *   the list and leaving a plain blank line.
 */
export function continueListOnEnter(
  text: string,
  cursor: number,
): { text: string; cursor: number } | null {
  if (cursor < 1 || text[cursor - 1] !== '\n') return null;

  const beforeNewline = text.slice(0, cursor - 1);
  const prevLineStart = beforeNewline.lastIndexOf('\n') + 1;
  const prevLine = text.slice(prevLineStart, cursor - 1);
  const parsed = parseLine(prevLine);

  if (parsed.type === 'plain') return null;

  if (parsed.body.trim() === '') {
    const newText = text.slice(0, prevLineStart) + text.slice(cursor);
    return { text: newText, cursor: prevLineStart };
  }

  let marker: string;
  if (parsed.type === 'ordered') marker = `${(parsed.order ?? 0) + 1}. `;
  else if (parsed.type === 'checkbox') marker = '[ ] ';
  else marker = '- ';

  const newText = text.slice(0, cursor) + marker + text.slice(cursor);
  return { text: newText, cursor: cursor + marker.length };
}

/**
 * Given the full text right after a space was typed at `cursor`, detect the
 * user just finished typing "[]" at the start of a line and rewrite it to
 * "[ ]" (the toggle-able form) — a trigger distinct from the "- " bullet.
 */
export function normalizeCheckboxTrigger(
  text: string,
  cursor: number,
): { text: string; cursor: number } | null {
  if (cursor < 3 || text.slice(cursor - 3, cursor) !== '[] ') return null;
  const lineStart = text.lastIndexOf('\n', cursor - 4) + 1;
  if (lineStart !== cursor - 3) return null; // "[] " must start the line

  const newText = text.slice(0, cursor - 3) + '[ ] ' + text.slice(cursor);
  return { text: newText, cursor: cursor + 1 };
}

/** Flip a checkbox line's checked state. `lineIndex` is 0-based. */
export function toggleCheckboxLine(text: string, lineIndex: number): string {
  const lines = text.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return text;
  const match = line.match(CHECKBOX_RE);
  if (!match) return text;
  const nextMark = match[1] === ' ' ? 'x' : ' ';
  lines[lineIndex] = `[${nextMark}] ${match[2]}`;
  return lines.join('\n');
}
