import { notePreview } from '../notePreview';
import type { Note } from '../../db/types';

function note(overrides: Partial<Note>): Note {
  return {
    id: 'n1',
    type: 'text',
    content: null,
    transcript: null,
    audio_uri: null,
    duration_ms: null,
    created_at: 0,
    day_key: '2026-07-19',
    tags: '[]',
    media_uris: null,
    ocr_text: null,
    ...overrides,
  };
}

describe('notePreview', () => {
  it('uses text content, falling back when empty', () => {
    expect(notePreview(note({ type: 'text', content: '  buy milk ' }))).toBe('buy milk');
    expect(notePreview(note({ type: 'text', content: '   ' }))).toBe('Text note');
  });

  it('uses a voice note transcript when present', () => {
    expect(notePreview(note({ type: 'voice', transcript: 'call mom' }))).toBe('call mom');
    expect(notePreview(note({ type: 'voice' }))).toBe('Voice note');
  });

  it('counts photo note images, tolerating garbage media_uris', () => {
    expect(notePreview(note({ type: 'photo', media_uris: '["a.jpg"]' }))).toBe(
      'Photo note (1 image)',
    );
    expect(notePreview(note({ type: 'photo', media_uris: '["a.jpg","b.jpg"]' }))).toBe(
      'Photo note (2 images)',
    );
    expect(notePreview(note({ type: 'photo', media_uris: 'not json' }))).toBe(
      'Photo note (0 images)',
    );
  });
});
