import { notedUpdatesToClipboard } from '../notedUpdates';
import type { NotedUpdate } from '../../db/notedUpdates';

function update(content: string, i = 0): NotedUpdate {
  return { id: `u${i}`, content, created_at: 1_000 + i };
}

describe('notedUpdatesToClipboard', () => {
  it('numbers the updates in order', () => {
    const text = notedUpdatesToClipboard([update('first', 0), update('second', 1)]);
    expect(text).toBe('1. first\n\n2. second');
  });

  it('separates items with a blank line', () => {
    const text = notedUpdatesToClipboard([update('a', 0), update('b', 1)]);
    expect(text.split('\n\n')).toHaveLength(2);
  });

  it('indents continuation lines under the first line', () => {
    const text = notedUpdatesToClipboard([update('line one\nline two')]);
    expect(text).toBe('1. line one\n   line two');
  });

  it('leaves blank lines inside an update unindented', () => {
    // Trailing spaces on an "empty" line would be invisible noise in a prompt.
    const text = notedUpdatesToClipboard([update('para one\n\npara two')]);
    expect(text).toBe('1. para one\n\n   para two');
  });

  it('trims surrounding whitespace so stray newlines do not shift the marker', () => {
    expect(notedUpdatesToClipboard([update('  spaced  ')])).toBe('1. spaced');
    expect(notedUpdatesToClipboard([update('\n\nlead\n\n')])).toBe('1. lead');
  });

  it('keeps numbering past nine', () => {
    const many = Array.from({ length: 11 }, (_, i) => update(`n${i}`, i));
    expect(notedUpdatesToClipboard(many)).toContain('11. n10');
  });

  it('returns an empty string for an empty list rather than crashing', () => {
    expect(notedUpdatesToClipboard([])).toBe('');
  });
});
