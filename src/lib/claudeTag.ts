// Notes marked as context for a Claude Code session.
//
// The app is offline and its database sits in private storage on the phone, so
// Claude can't read notes directly. Instead a tagged note is exported to one
// markdown file, saved to the phone's Downloads, and pulled to the laptop by
// scripts/pull-claude-notes.sh. This module is the single source of truth for
// the tag and the file, so the writer and the reader can't drift apart.
import type { Note } from '../db/types';

/** The one tag this feature uses. Stored in the note's `tags` JSON array. */
export const CLAUDE_TAG = 'claude';

/** Stable name so the pull script always knows what to look for. */
export const CLAUDE_EXPORT_FILENAME = 'dayfeed-claude-notes.md';

/**
 * Whether a note's `tags` column marks it for Claude.
 *
 * Defensive about the column's contents: it's free-form JSON text, and a row
 * that somehow holds garbage should read as "not tagged" rather than throw
 * partway through rendering a feed.
 */
export function hasClaudeTag(tagsJson: string | null | undefined): boolean {
  if (!tagsJson) return false;
  try {
    const parsed: unknown = JSON.parse(tagsJson);
    return Array.isArray(parsed) && parsed.includes(CLAUDE_TAG);
  } catch {
    return false;
  }
}

function stamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The text a note contributes: its body, or for a voice note its transcript. */
export function noteExportText(note: Note): string | null {
  const text = note.type === 'voice' ? note.transcript : note.content;
  return text?.trim() ? text.trim() : null;
}

/**
 * Render tagged notes as one markdown document for Claude to read.
 *
 * A voice note that hasn't been transcribed yet carries no text to hand over,
 * so it's called out by name rather than emitted as an empty section — silence
 * there would look like the note simply didn't export.
 */
export function claudeNotesToMarkdown(notes: Note[], exportedAt: number = Date.now()): string {
  const lines: string[] = [
    '# DayFeed — notes tagged for Claude',
    '',
    `Exported ${stamp(exportedAt)} · ${notes.length} note${notes.length === 1 ? '' : 's'}`,
    '',
  ];

  if (notes.length === 0) {
    lines.push('_No notes are currently tagged._', '');
    return lines.join('\n');
  }

  for (const note of notes) {
    const text = noteExportText(note);
    lines.push(`## ${stamp(note.created_at)}${note.type === 'voice' ? ' · voice' : ''}`, '');
    lines.push(text ?? '_(voice note, not transcribed yet)_', '');
  }

  return lines.join('\n');
}
