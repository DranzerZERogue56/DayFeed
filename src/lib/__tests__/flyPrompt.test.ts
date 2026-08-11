import {
  DEFAULT_FLY_PROMPT,
  buildFlyClipboard,
  untranscribedCount,
} from '../flyPrompt';
import type { FlyNote } from '../../db/flyTypes';

// A fixed local-time day so the formatted clock times are stable.
const DAY = '2026-08-11';
const at = (h: number, m: number) => new Date(2026, 7, 11, h, m).getTime();

function text(id: string, h: number, m: number, content: string): FlyNote {
  return {
    id,
    type: 'text',
    content,
    audio_uri: null,
    duration_ms: null,
    transcript: null,
    created_at: at(h, m),
    day_key: DAY,
  };
}

function voice(id: string, h: number, m: number, transcript: string | null): FlyNote {
  return {
    id,
    type: 'voice',
    content: null,
    audio_uri: `file:///${id}.wav`,
    duration_ms: 1500,
    transcript,
    created_at: at(h, m),
    day_key: DAY,
  };
}

describe('buildFlyClipboard', () => {
  it('leads with the prompt and names the day both ways', () => {
    const out = buildFlyClipboard(DEFAULT_FLY_PROMPT, DAY, [text('a', 9, 5, 'woke up late')]);
    expect(out.startsWith(DEFAULT_FLY_PROMPT)).toBe(true);
    // The weekday is why the header is spelled out; the key disambiguates it.
    expect(out).toContain('Tue, Aug 11 2026 (2026-08-11)');
  });

  it('marks voice entries and leaves text entries unmarked', () => {
    const out = buildFlyClipboard('P', DAY, [
      text('a', 9, 5, 'woke up late'),
      voice('b', 14, 30, 'standup ran long'),
    ]);
    expect(out).toContain('9:05 AM  woke up late');
    expect(out).toContain('2:30 PM  [voice] standup ran long');
  });

  it('keeps entries in the order given', () => {
    const out = buildFlyClipboard('P', DAY, [
      text('a', 9, 5, 'first'),
      text('b', 17, 0, 'second'),
    ]);
    expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'));
  });

  it('skips entries with nothing to say', () => {
    // An untranscribed memo contributes no text; a blank timestamp in the list
    // reads to a model like a moment that mattered but wasn't described.
    const out = buildFlyClipboard('P', DAY, [
      voice('a', 9, 5, null),
      text('b', 10, 0, '   '),
      text('c', 11, 0, 'the only real one'),
    ]);
    expect(out).toContain('the only real one');
    expect(out).not.toContain('9:05 AM');
    expect(out).not.toContain('10:00 AM');
  });

  it('indents continuation lines so a multi-line note stays one entry', () => {
    const out = buildFlyClipboard('P', DAY, [text('a', 9, 5, 'line one\nline two')]);
    expect(out).toContain('9:05 AM  line one\n         line two');
  });

  it('handles a day with no entries at all', () => {
    const out = buildFlyClipboard('P', DAY, []);
    expect(out).toContain('Tue, Aug 11 2026');
    expect(out.trim().endsWith('(2026-08-11)')).toBe(true);
  });
});

describe('untranscribedCount', () => {
  it('counts only voice entries still missing a transcript', () => {
    expect(
      untranscribedCount([
        voice('a', 9, 0, null),
        voice('b', 10, 0, '  '),
        voice('c', 11, 0, 'done'),
        text('d', 12, 0, 'text notes never count'),
      ]),
    ).toBe(2);
  });

  it('is zero for a fully transcribed day', () => {
    expect(untranscribedCount([text('a', 9, 0, 'x'), voice('b', 10, 0, 'y')])).toBe(0);
  });
});
