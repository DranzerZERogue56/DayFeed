import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from '../hooks/AudioPlayerContext';
import type { Note } from '../db/types';
import { formatDuration } from '../utils/date';
import { fonts, radius, spacing, type ColorPalette } from '../theme';
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
      <View style={[styles.iconWrap, { borderColor: iconColor }]}>
        <Text style={[styles.icon, { color: iconColor }]}>{isPlaying ? '❚❚' : '▶'}</Text>
      </View>
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
  // 2/3 of the original 34dp control — the transcript is the main content
  // once it exists, so the player reads as a secondary strip beneath it.
  iconWrap: {
    width: 23,
    height: 23,
    borderRadius: radius.pill,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 9,
    fontWeight: '700',
  },
  duration: {
    fontFamily: fonts.mono,
    marginLeft: spacing.sm,
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
});
