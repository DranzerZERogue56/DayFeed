// Which of a note's several text fields the Copy action should put on the
// clipboard. Each note type keeps its text somewhere different, and a note can
// legitimately have none yet — an un-transcribed voice note, a photo whose OCR
// hasn't been run — in which case Copy shouldn't be offered at all.
import type { Note } from '../db/types';

/** The note's text for copying, or null when there is nothing to copy yet. */
export function copyableText(note: Pick<Note, 'type' | 'content' | 'transcript' | 'ocr_text'>) {
  const text =
    note.type === 'voice' ? note.transcript : note.type === 'photo' ? note.ocr_text : note.content;
  return text?.trim() ? text : null;
}
