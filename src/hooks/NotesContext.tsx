import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  addDetectedDates,
  createNote as dbCreateNote,
  deleteDetectedDatesForNote,
  deleteNote as dbDeleteNote,
  getNote,
  getReminderIdsForNote,
  initDb,
  setNoteExpiry,
  setOcrText,
  setTranscript,
  updateNoteContent,
} from '../db';
import { expiryForDay, msUntilNextExpiry } from '../lib/expiry';
import { cleanupNote, sweepExpiredNotes } from '../lib/expirySweep';
import { cancelReminder } from '../lib/reminders';
import { parseMediaUris, type NewNoteInput, type Note } from '../db/types';
import { deleteAudioFile } from '../utils/audioFiles';
import { deleteImageFiles } from '../utils/mediaFiles';
import { detectDates } from '../lib/dateDetection';

interface NotesContextValue {
  /** Bumps on every mutation; screens depend on it to re-query. */
  version: number;
  ready: boolean;
  addNote: (input: NewNoteInput) => Promise<Note>;
  removeNote: (id: string) => Promise<void>;
  /** Save an on-device transcript, then run date detection over it. */
  saveTranscript: (note: Note, transcript: string) => Promise<void>;
  /** Save on-device OCR text extracted from a photo note's images. */
  saveOcrText: (note: Note, text: string) => Promise<void>;
  /** Overwrite a text note's content (checkbox toggles). */
  editNoteContent: (note: Note, content: string) => Promise<void>;
  /** Tag/untag a note to delete itself at 11:59 PM tonight. */
  toggleNoteExpiry: (note: Note) => Promise<void>;
  /** Delete every note past its expiry. Safe to call repeatedly. */
  sweepExpired: () => Promise<void>;
  /** Force a re-read without mutating (rarely needed). */
  refresh: () => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setReady(true));
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const addNote = useCallback(
    async (input: NewNoteInput) => {
      const note = await dbCreateNote(input);
      // Detect present/future dates in new text notes (v1.1). New notes only.
      if (note.content) {
        const hits = detectDates(note.content, note.created_at);
        await addDetectedDates(note.id, hits);
      }
      bump();
      return note;
    },
    [bump],
  );

  const saveTranscript = useCallback(
    async (note: Note, transcript: string) => {
      await setTranscript(note.id, transcript);
      // Re-detecting replaces this note's dates rather than piling on top of
      // them, so re-transcribing or editing a transcript doesn't duplicate it
      // in the Agenda. Cancel any scheduled reminders before the rows go away.
      for (const rid of await getReminderIdsForNote(note.id)) await cancelReminder(rid);
      await deleteDetectedDatesForNote(note.id);
      const hits = detectDates(transcript, note.created_at);
      await addDetectedDates(note.id, hits);
      bump();
    },
    [bump],
  );

  const saveOcrText = useCallback(
    async (note: Note, text: string) => {
      await setOcrText(note.id, text);
      bump();
    },
    [bump],
  );

  const editNoteContent = useCallback(
    async (note: Note, content: string) => {
      await updateNoteContent(note.id, content);
      bump();
    },
    [bump],
  );

  const removeNote = useCallback(
    async (id: string) => {
      const existing = await getNote(id);
      if (existing) await cleanupNote(existing);
      await dbDeleteNote(id);
      bump();
    },
    [bump],
  );

  /**
   * Delete every note whose expiry has passed.
   *
   * Runs at launch before the Feed renders, on return to the foreground, and
   * from a timer at 11:59 PM if the app happens to be open. The app is offline
   * with no reliable background execution, so a note can outlive its deadline
   * on screen — but never past the next time the app is looked at.
   */
  const sweepExpired = useCallback(async () => {
    if ((await sweepExpiredNotes()) > 0) bump();
  }, [bump]);

  const toggleNoteExpiry = useCallback(
    async (note: Note) => {
      await setNoteExpiry(note.id, note.expires_at == null ? expiryForDay(Date.now()) : null);
      bump();
    },
    [bump],
  );

  // Sweep when the app comes back to the foreground, and again at the next
  // 11:59 PM if it is still open then. The timer re-arms itself so an app left
  // running for days keeps clearing each night.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sweepExpired();
    });

    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        void sweepExpired();
        arm();
      }, msUntilNextExpiry(Date.now()));
    };
    arm();

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [sweepExpired]);

  const value = useMemo(
    () => ({
      version,
      ready,
      addNote,
      removeNote,
      saveTranscript,
      saveOcrText,
      editNoteContent,
      toggleNoteExpiry,
      sweepExpired,
      refresh: bump,
    }),
    [
      version,
      ready,
      addNote,
      removeNote,
      saveTranscript,
      saveOcrText,
      editNoteContent,
      toggleNoteExpiry,
      sweepExpired,
      bump,
    ],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
}
