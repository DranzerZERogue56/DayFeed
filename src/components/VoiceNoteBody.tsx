import React, { createContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { Note } from '../db/types';
import VoicePlayerRow from './VoicePlayerRow';

type PlayableNote = Pick<Note, 'id' | 'audio_uri' | 'duration_ms' | 'transcript'>;

/**
 * Lets the transcribe control render the hide-audio toggle beside its Edit
 * button while the hidden state stays here, next to the player it collapses.
 * Null when there is no transcript, i.e. nothing to collapse down to.
 */
export interface AudioToggle {
  hidden: boolean;
  onToggle: () => void;
}

export const AudioToggleContext = createContext<AudioToggle | null>(null);

interface Props {
  note: PlayableNote;
  variant?: 'own' | 'paper' | 'list';
  /** The TranscribeButton/TranscribeControl element for this note. */
  children: React.ReactNode;
  /**
   * Notified whenever the player's collapsed state changes. For a caller that
   * renders its own footer *outside* this component (NoteBubble's timestamp
   * row), this is how that footer learns to tighten up when there's no player
   * above it.
   */
  onHiddenChange?: (hidden: boolean) => void;
}

// Wraps a voice note's player + transcribe control. Once a transcript exists,
// the transcribe control shows a collapse toggle (beside its Edit button) that
// collapses the player and its controls away, leaving just the text.
export default function VoiceNoteBody({ note, variant, children, onHiddenChange }: Props) {
  const [audioHidden, setAudioHidden] = useState(false);
  const hasTranscript = !!note.transcript;
  const showPlayer = !hasTranscript || !audioHidden;

  const toggle = useMemo<AudioToggle>(
    () => ({
      hidden: audioHidden,
      onToggle: () =>
        setAudioHidden((h) => {
          const next = !h;
          onHiddenChange?.(next);
          return next;
        }),
    }),
    [audioHidden, onHiddenChange],
  );

  return (
    <View>
      {showPlayer && <VoicePlayerRow note={note} variant={variant} />}
      <AudioToggleContext.Provider value={hasTranscript ? toggle : null}>
        {children}
      </AudioToggleContext.Provider>
    </View>
  );
}
