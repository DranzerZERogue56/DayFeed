import React, { createContext, useMemo } from 'react';
import type { Note } from '../db/types';

export type PlayableNote = Pick<Note, 'id' | 'audio_uri' | 'duration_ms' | 'transcript'>;

/**
 * Hands the note down to the transcribe control so it can render the player on
 * the same row as its own actions.
 *
 * The two have to share a row — transcript above, `▶ 0:01 ✎` below — but the
 * edit action drives state inside TranscribeControl while the note is known
 * here, so one of them has to reach the other. Passing the note down is the
 * cheaper direction.
 */
export interface VoicePlayerValue {
  note: PlayableNote;
}

export const VoicePlayerContext = createContext<VoicePlayerValue | null>(null);

interface Props {
  note: PlayableNote;
  /** The TranscribeButton/TranscribeControl element for this note. */
  children: React.ReactNode;
}

// Provides a voice note's player to the transcribe control beneath it.
//
// Note the invariant: this renders no player of its own, so a VoiceNoteBody
// with no TranscribeControl underneath shows no play button. Every call site
// passes one. A TranscribeControl used *without* this provider (none today)
// simply renders no player rather than failing.
export default function VoiceNoteBody({ note, children }: Props) {
  // Memoized: this value goes into context, so a fresh object every render
  // would re-render every consumer beneath it.
  const value = useMemo<VoicePlayerValue>(() => ({ note }), [note]);

  return <VoicePlayerContext.Provider value={value}>{children}</VoicePlayerContext.Provider>;
}
