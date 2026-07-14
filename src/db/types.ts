// Data model for a DayFeed note. One `notes` table backs the whole app.
export type NoteType = 'text' | 'voice' | 'photo';

export interface Note {
  id: string;
  type: NoteType;
  /** Text body. Null for voice notes. */
  content: string | null;
  /** Reserved for v1.1 (whisper.rn). Always null for now. */
  transcript: string | null;
  /** Local file URI for voice notes. Null otherwise. */
  audio_uri: string | null;
  /** Voice note length in ms. Null for text. */
  duration_ms: number | null;
  /** Unix epoch milliseconds. */
  created_at: number;
  /** 'YYYY-MM-DD' in the device's local timezone, derived once at creation. */
  day_key: string;
  /** JSON array string of tags. '[]' for now. */
  tags: string;
  /** JSON array string of local image URIs (photo notes). Null otherwise. */
  media_uris: string | null;
}

/** Parse a photo note's media_uris JSON into a string[]. Safe on null/garbage. */
export function parseMediaUris(note: Pick<Note, 'media_uris'>): string[] {
  if (!note.media_uris) return [];
  try {
    const arr = JSON.parse(note.media_uris);
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

/** Shape accepted by createNote. The db fills in id/created_at/day_key/defaults. */
export interface NewNoteInput {
  type: NoteType;
  content?: string | null;
  transcript?: string | null;
  audio_uri?: string | null;
  duration_ms?: number | null;
  tags?: string[];
  /** Local image URIs for photo notes (already copied into app storage). */
  media_uris?: string[] | null;
  /** Optional override, mainly for seeding. Defaults to now. */
  created_at?: number;
}
