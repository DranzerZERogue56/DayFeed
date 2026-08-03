import {
  CLAUDE_TAG,
  claudeNotesToMarkdown,
  hasClaudeTag,
  noteExportText,
} from '../claudeTag';
import type { Note } from '../../db/types';

function note(over: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    type: 'text',
    content: 'a note body',
    transcript: null,
    audio_uri: null,
    duration_ms: null,
    created_at: new Date(2026, 7, 3, 9, 5).getTime(),
    day_key: '2026-08-03',
    tags: '[]',
    media_uris: null,
    ocr_text: null,
    ...over,
  };
}

describe('hasClaudeTag', () => {
  it('is true when the tag is present', () => {
    expect(hasClaudeTag(JSON.stringify([CLAUDE_TAG]))).toBe(true);
    expect(hasClaudeTag('["other","claude"]')).toBe(true);
  });

  it('is false for an untagged note', () => {
    expect(hasClaudeTag('[]')).toBe(false);
    expect(hasClaudeTag('["other"]')).toBe(false);
  });

  it('does not match a tag that merely contains the word', () => {
    expect(hasClaudeTag('["claudette"]')).toBe(false);
    expect(hasClaudeTag('["not-claude"]')).toBe(false);
  });

  it('is false rather than throwing on a malformed column', () => {
    expect(() => hasClaudeTag('{oops')).not.toThrow();
    expect(hasClaudeTag('{oops')).toBe(false);
    expect(hasClaudeTag('"claude"')).toBe(false); // valid JSON, wrong shape
    expect(hasClaudeTag(null)).toBe(false);
    expect(hasClaudeTag(undefined)).toBe(false);
    expect(hasClaudeTag('')).toBe(false);
  });
});

describe('noteExportText', () => {
  it('takes a text note body', () => {
    expect(noteExportText(note({ content: 'hello' }))).toBe('hello');
  });

  it('takes a voice note transcript, not its content', () => {
    expect(noteExportText(note({ type: 'voice', transcript: 'spoken', content: 'x' }))).toBe(
      'spoken',
    );
  });

  it('is null when there is no usable text', () => {
    expect(noteExportText(note({ content: '   ' }))).toBeNull();
    expect(noteExportText(note({ type: 'voice', transcript: null }))).toBeNull();
  });
});

describe('claudeNotesToMarkdown', () => {
  const at = new Date(2026, 7, 3, 14, 30).getTime();

  it('includes each note body', () => {
    const md = claudeNotesToMarkdown([note({ content: 'first' }), note({ content: 'second' })], at);
    expect(md).toContain('first');
    expect(md).toContain('second');
  });

  it('keeps the order it is given, so the export reads chronologically', () => {
    const md = claudeNotesToMarkdown(
      [note({ content: 'earlier' }), note({ content: 'later' })],
      at,
    );
    expect(md.indexOf('earlier')).toBeLessThan(md.indexOf('later'));
  });

  it('exports a voice note by its transcript', () => {
    const md = claudeNotesToMarkdown([note({ type: 'voice', transcript: 'what I said' })], at);
    expect(md).toContain('what I said');
    expect(md).toContain('voice');
  });

  it('calls out an untranscribed voice note instead of leaving a blank section', () => {
    const md = claudeNotesToMarkdown([note({ type: 'voice', transcript: null })], at);
    expect(md).toContain('not transcribed yet');
  });

  it('reports the note count, pluralised', () => {
    expect(claudeNotesToMarkdown([note()], at)).toContain('1 note');
    expect(claudeNotesToMarkdown([note(), note()], at)).toContain('2 notes');
  });

  it('stamps the export time', () => {
    expect(claudeNotesToMarkdown([note()], at)).toContain('2026-08-03 14:30');
  });

  it('gives each note a heading with its own timestamp', () => {
    const md = claudeNotesToMarkdown([note()], at);
    expect(md).toContain('## 2026-08-03 09:05');
  });

  it('produces a valid document for an empty list rather than crashing', () => {
    const md = claudeNotesToMarkdown([], at);
    expect(md).toContain('0 notes');
    expect(md).toContain('No notes are currently tagged');
  });
});
