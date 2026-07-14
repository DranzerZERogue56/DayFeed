import { parseMediaUris, type Note } from '../db/types';

/** Short human preview of any note type, for agenda/source references. */
export function notePreview(note: Note): string {
  if (note.type === 'text') return note.content?.trim() || 'Text note';
  if (note.type === 'voice') {
    return note.transcript?.trim() || 'Voice note';
  }
  if (note.type === 'photo') {
    const n = parseMediaUris(note).length;
    return `Photo note (${n} image${n === 1 ? '' : 's'})`;
  }
  return 'Note';
}
