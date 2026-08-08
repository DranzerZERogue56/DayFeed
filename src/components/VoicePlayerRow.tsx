import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAudioPlayer } from '../hooks/AudioPlayerContext';
import type { Note } from '../db/types';
import { formatDuration } from '../utils/date';
import { fonts, spacing, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

/** Structural, not `Note` — Flop voice notes live in their own table but play the same. */
type PlayableNote = Pick<Note, 'id' | 'audio_uri' | 'duration_ms'>;

interface Props {
  note: PlayableNote;
}

// Play/pause toggle + elapsed/total duration. No waveform (per spec). Sits
// inline in the transcribe control's bottom row, beneath the transcript.
export default function VoicePlayerRow({ note }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const player = useAudioPlayer();
  const isCurrent = player.noteId === note.id;
  const isPlaying = isCurrent && player.isPlaying;

  const total = note.duration_ms ?? player.durationMs;
  const pos = isCurrent ? player.positionMs : 0;
  const label = isCurrent && pos > 0 ? formatDuration(pos) : formatDuration(total);

  // Play control is always the bronze accent (per design).
  const iconColor = colors.accent;
  const textColor = colors.textDim;

  const onPress = () => {
    if (!note.audio_uri) return;
    void player.toggle(note.id, note.audio_uri);
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
    >
      <Text style={[styles.icon, { color: iconColor }]}>{isPlaying ? '❚❚' : '▶'}</Text>
      <Text style={[styles.duration, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // A bare glyph at the same size as the edit pencil it sits beside — the two
  // read as one pair of controls. The circle this used to wear made the play
  // button the heaviest thing on a row where the transcript is the point.
  icon: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '700',
    // Fixed width so swapping ▶ for the wider ❚❚ doesn't shove the duration
    // and everything after it sideways on every play/pause.
    minWidth: 18,
    textAlign: 'center',
  },
  duration: {
    fontFamily: fonts.mono,
    marginLeft: spacing.sm,
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
});
