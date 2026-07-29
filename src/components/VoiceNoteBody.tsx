import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Note } from '../db/types';
import VoicePlayerRow from './VoicePlayerRow';
import { fonts, spacing, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

type PlayableNote = Pick<Note, 'id' | 'audio_uri' | 'duration_ms' | 'transcript'>;

interface Props {
  note: PlayableNote;
  variant?: 'own' | 'paper' | 'list';
  /** The TranscribeButton/TranscribeControl element for this note. */
  children: React.ReactNode;
}

// Wraps a voice note's player + transcribe control. Once a transcript exists,
// offers a "Hide audio" toggle that collapses the player and its controls
// away, leaving just the transcribed text.
export default function VoiceNoteBody({ note, variant, children }: Props) {
  const [audioHidden, setAudioHidden] = useState(false);
  const styles = useStyles(makeStyles);
  const hasTranscript = !!note.transcript;
  const showPlayer = !hasTranscript || !audioHidden;

  return (
    <View>
      {showPlayer && <VoicePlayerRow note={note} variant={variant} />}
      {children}
      {hasTranscript && (
        <TouchableOpacity onPress={() => setAudioHidden((h) => !h)}>
          <Text style={styles.toggleLink}>{audioHidden ? 'Show audio' : 'Hide audio'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    toggleLink: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
  });
