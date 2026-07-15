// Data model for Flop — long-form, day-independent notes with typed children.
// Deliberately separate from `notes`: no day_key, no Feed/Flip/View All presence,
// never indexed by search. Backed by its own `flop_notes` table.

/** 'root' only ever pairs with a null parent_id. */
export type FlopRelation = 'root' | 'support' | 'idea' | 'oppose';
/** The three relations a child can carry. */
export type FlopChildRelation = 'support' | 'idea' | 'oppose';
export type FlopNoteType = 'text' | 'voice';

export const CHILD_RELATIONS: FlopChildRelation[] = ['support', 'idea', 'oppose'];

export interface FlopNote {
  id: string;
  /** Null means a root-level Flop note. */
  parent_id: string | null;
  relation: FlopRelation;
  type: FlopNoteType;
  /** Body text; the first line is the display title. Null for voice notes. */
  content: string | null;
  audio_uri: string | null;
  duration_ms: number | null;
  transcript: string | null;
  created_at: number;
  /** Flop notes are editable, unlike stream notes. */
  updated_at: number;
  /** Manual position among siblings sharing a parent + relation. */
  sort_order: number;
}

/** Shape accepted by createFlopNote. The db fills in id/created_at/updated_at/sort_order. */
export interface NewFlopNoteInput {
  parent_id?: string | null;
  relation: FlopRelation;
  type: FlopNoteType;
  content?: string | null;
  audio_uri?: string | null;
  duration_ms?: number | null;
}

/** Direct-child counts by relation, used for the root list's shape-at-a-glance chips. */
export type RelationCounts = Record<FlopChildRelation, number>;

export const emptyCounts = (): RelationCounts => ({ support: 0, idea: 0, oppose: 0 });

export function totalCount(c: RelationCounts): number {
  return c.support + c.idea + c.oppose;
}

/** A root note plus its direct-child counts. */
export interface FlopRoot extends FlopNote {
  counts: RelationCounts;
}

/** Just the pieces the breadcrumb needs, ordered root-first. */
export interface FlopCrumb {
  id: string;
  title: string;
}

const UNTITLED = 'Untitled';

/**
 * Display title: the first line of the body. Voice notes have no body until they
 * are transcribed, so they fall back to the transcript's first line.
 */
export function flopTitle(note: Pick<FlopNote, 'content' | 'type' | 'transcript'>): string {
  const source = note.content?.trim() || (note.type === 'voice' ? note.transcript?.trim() : '');
  if (!source) return note.type === 'voice' ? 'Voice note' : UNTITLED;
  const first = source.split('\n')[0].trim();
  return first || UNTITLED;
}

/** Everything after the first line — the preview/body under the title. */
export function flopBody(note: Pick<FlopNote, 'content'>): string {
  const content = note.content ?? '';
  const nl = content.indexOf('\n');
  return nl === -1 ? '' : content.slice(nl + 1).trim();
}
