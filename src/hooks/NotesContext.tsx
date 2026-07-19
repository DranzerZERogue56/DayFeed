import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  addDetectedDates,
  createNote as dbCreateNote,
  deleteNote as dbDeleteNote,
  getNote,
  getReminderIdsForNote,
  initDb,
  setTranscript,
} from '../db';
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
      // Immediately run date detection on the fresh transcript (Phase 4 hook).
      const hits = detectDates(transcript, note.created_at);
      await addDetectedDates(note.id, hits);
      bump();
    },
    [bump],
  );

  const removeNote = useCallback(
    async (id: string) => {
      // Clean up associated files; detected_dates cascade via the FK. Scheduled
      // reminders live with the OS, so cancel them before the rows go away.
      const existing = await getNote(id);
      if (existing?.audio_uri) await deleteAudioFile(existing.audio_uri);
      if (existing) {
        const media = parseMediaUris(existing);
        if (media.length) await deleteImageFiles(media);
      }
      for (const rid of await getReminderIdsForNote(id)) await cancelReminder(rid);
      await dbDeleteNote(id);
      bump();
    },
    [bump],
  );

  const value = useMemo(
    () => ({ version, ready, addNote, removeNote, saveTranscript, refresh: bump }),
    [version, ready, addNote, removeNote, saveTranscript, bump],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
}
