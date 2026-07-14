import * as chrono from 'chrono-node';
import type { DetectedDateInput } from '../db/detectedDates';
import { dayKeyFromDate, dayKeyFromMs } from '../utils/date';

const SNIPPET_LEAD = 40; // chars of leading context to include around a match
const SNIPPET_MAX = 90;

// Build a readable snippet: the matched phrase plus a little leading context, so
// "on the 14th" reads as "dentist appointment on the 14th".
function makeSnippet(text: string, index: number, matchText: string): string {
  const start = Math.max(0, index - SNIPPET_LEAD);
  let lead = text.slice(start, index);
  // Trim to a word boundary so we don't start mid-word.
  if (start > 0) {
    const sp = lead.search(/\s/);
    if (sp > -1) lead = lead.slice(sp + 1);
  }
  let snippet = (lead + matchText).trim().replace(/\s+/g, ' ');
  if (start > 0 && lead.length) snippet = '…' + snippet;
  if (snippet.length > SNIPPET_MAX) snippet = snippet.slice(0, SNIPPET_MAX - 1).trimEnd() + '…';
  return snippet;
}

// A chrono result carries a real date only when a day/weekday/month/year is
// actually stated — this filters out pure time mentions like "at 3pm".
function hasDateComponent(result: chrono.ParsedResult): boolean {
  const s = result.start;
  return (
    s.isCertain('day') ||
    s.isCertain('weekday') ||
    s.isCertain('month') ||
    s.isCertain('year')
  );
}

/**
 * Detect present/future date references in a note's text.
 *
 * @param text  the note content or transcript
 * @param referenceMs  the note's created_at (chrono's reference so "next Friday"
 *                     resolves relative to when the note was written)
 *
 * Purely past dates (resolving before the note's own day) are ignored.
 */
export function detectDates(text: string, referenceMs: number): DetectedDateInput[] {
  if (!text || !text.trim()) return [];

  const refDate = new Date(referenceMs);
  const refDayKey = dayKeyFromMs(referenceMs);

  const results = chrono.parse(text, refDate, { forwardDate: false });
  const out: DetectedDateInput[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (!hasDateComponent(r)) continue;
    const date = r.start.date();
    const dateKey = dayKeyFromDate(date);
    // Ignore purely past dates (before the day the note was written).
    if (dateKey < refDayKey) continue;

    const key = `${dateKey}|${r.index}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      date_key: dateKey,
      snippet: makeSnippet(text, r.index, r.text),
    });
  }

  return out;
}
