import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer } from '../hooks/AudioPlayerContext';
import type { Note } from '../db/types';
import { formatDuration } from '../utils/date';
import { colors, radius, spacing } from '../theme';

interface Props {
  note: Note;
  /** 'own' = tinted for the sender bubble; 'paper' = notebook page; 'list' = View All. */
  variant?: 'own' | 'paper' | 'list';
}

// Play/pause toggle + duration label. No waveform (per spec). Shows live progress
// while this note is the one playing.
export default function VoicePlayerRow({ note, variant = 'own' }: Props) {
  const player = useAudioPlayer();
  const isCurrent = player.noteId === note.id;
  const isPlaying = isCurrent && player.isPlaying;

  const total = note.duration_ms ?? player.durationMs;
  const pos = isCurrent ? player.positionMs : 0;
  const progress = total > 0 ? Math.min(1, pos / total) : 0;
  const label = isCurrent && pos > 0 ? formatDuration(pos) : formatDuration(total);

  const paper = variant === 'paper';
  const iconColor = paper ? colors.pageText : colors.voiceAccent;
  const trackBg = paper ? colors.pageLine : colors.surfaceAlt;
  const textColor = paper ? colors.pageText : colors.text;

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
      <View style={styles.middle}>
        <View style={[styles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: iconColor, width: `${progress * 100}%` },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.duration, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 13,
    fontWeight: '700',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  duration: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
});
