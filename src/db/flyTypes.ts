// Data model for Fly — the daily journal. Text and voice only: a Fly day is
// meant to be read back as prose, and a photo has nothing to contribute to a
// clipboard payload a language model turns into a story.
export type FlyNoteType = 'text' | 'voice';

export interface FlyNote {
  id: string;
  type: FlyNoteType;
  /** Text body. Null for voice memos. */
  content: string | null;
  /** Local file URI for voice memos. Null otherwise. */
  audio_uri: string | null;
  /** Voice memo length in ms. Null for text. */
  duration_ms: number | null;
  /** On-device transcript of a voice memo. Null until transcribed. */
  transcript: string | null;
  /** Unix epoch milliseconds. */
  created_at: number;
  /** 'YYYY-MM-DD' in the device's local timezone, derived once at creation. */
  day_key: string;
}

/** Shape accepted by createFlyNote. The db fills in id/created_at/day_key. */
export interface NewFlyNoteInput {
  type: FlyNoteType;
  content?: string | null;
  audio_uri?: string | null;
  duration_ms?: number | null;
  /** Optional override, mainly for tests. Defaults to now. */
  created_at?: number;
}

/**
 * One day's consolidated story. Keyed by day_key rather than an id: a day has
 * exactly one story, which makes regeneration an upsert instead of a
 * delete-then-insert.
 */
export interface FlyStory {
  day_key: string;
  content: string;
  created_at: number;
  updated_at: number;
}
