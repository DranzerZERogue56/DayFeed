import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  createFlopNote as dbCreateFlopNote,
  deleteFlopNote as dbDeleteFlopNote,
  getFlopSubtreeAudioUris,
  moveFlopNote as dbMoveFlopNote,
  setFlopRelation as dbSetFlopRelation,
  setFlopTranscript,
  updateFlopNote as dbUpdateFlopNote,
} from '../db';
import type { FlopChildRelation, FlopNote, NewFlopNoteInput } from '../db/flopTypes';
import { deleteAudioFile } from '../utils/audioFiles';

// Mutation surface for Flop. Deliberately separate from NotesContext: Flop notes
// never touch day_key, never run date detection (Flop is timeless by design), and
// never appear in the Feed, Flip, View All, or search.
interface FlopContextValue {
  /** Bumps on every mutation; screens depend on it to re-query. */
  version: number;
  addFlopNote: (input: NewFlopNoteInput) => Promise<FlopNote>;
  editFlopNote: (id: string, content: string) => Promise<void>;
  saveFlopTranscript: (id: string, transcript: string) => Promise<void>;
  changeRelation: (id: string, relation: FlopChildRelation) => Promise<void>;
  moveNote: (id: string, direction: 'up' | 'down') => Promise<void>;
  /** Deletes the note and its entire subtree, cleaning up every audio file within. */
  removeFlopNote: (id: string) => Promise<void>;
  refresh: () => void;
}

const FlopContext = createContext<FlopContextValue | null>(null);

export function FlopProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const addFlopNote = useCallback(
    async (input: NewFlopNoteInput) => {
      const note = await dbCreateFlopNote(input);
      bump();
      return note;
    },
    [bump],
  );

  const editFlopNote = useCallback(
    async (id: string, content: string) => {
      await dbUpdateFlopNote(id, content);
      bump();
    },
    [bump],
  );

  const saveFlopTranscript = useCallback(
    async (id: string, transcript: string) => {
      await setFlopTranscript(id, transcript);
      bump();
    },
    [bump],
  );

  const changeRelation = useCallback(
    async (id: string, relation: FlopChildRelation) => {
      await dbSetFlopRelation(id, relation);
      bump();
    },
    [bump],
  );

  const moveNote = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await dbMoveFlopNote(id, direction);
      bump();
    },
    [bump],
  );

  const removeFlopNote = useCallback(
    async (id: string) => {
      // Collect the subtree's audio before the row goes away — the FK cascade
      // takes the descendants with it, and their files would otherwise leak.
      const uris = await getFlopSubtreeAudioUris(id);
      await dbDeleteFlopNote(id);
      for (const uri of uris) await deleteAudioFile(uri);
      bump();
    },
    [bump],
  );

  const value = useMemo(
    () => ({
      version,
      addFlopNote,
      editFlopNote,
      saveFlopTranscript,
      changeRelation,
      moveNote,
      removeFlopNote,
      refresh: bump,
    }),
    [version, addFlopNote, editFlopNote, saveFlopTranscript, changeRelation, moveNote, removeFlopNote, bump],
  );

  return <FlopContext.Provider value={value}>{children}</FlopContext.Provider>;
}

export function useFlop(): FlopContextValue {
  const ctx = useContext(FlopContext);
  if (!ctx) throw new Error('useFlop must be used within a FlopProvider');
  return ctx;
}
