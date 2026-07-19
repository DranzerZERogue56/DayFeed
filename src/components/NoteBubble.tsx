import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { parseMediaUris, type Note } from '../db/types';
import { formatClock } from '../utils/date';
import { colors, fonts, radius, shadows, spacing, type } from '../theme';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';

interface Props {
  note: Note;
  onDelete: (note: Note) => void;
  /** Absent for photo notes' callers or when promotion isn't offered. */
  onSendToFlop?: (note: Note) => void;
}

// Chat-style bubble for the Feed. Long-press for actions (send to Flop, delete).
export default function NoteBubble({ note, onDelete, onSendToFlop }: Props) {
  const isVoice = note.type === 'voice';
  const isPhoto = note.type === 'photo';
  const media = isPhoto ? parseMediaUris(note) : [];
  const [viewer, setViewer] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const confirmDelete = () => {
    const detail = isVoice
      ? 'This voice note will be permanently removed.'
      : isPhoto
        ? 'This photo note and its images will be permanently removed.'
        : 'This note will be permanently removed.';
    Alert.alert('Delete note?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(note) },
    ]);
  };

  // Photo notes can't be promoted — Flop has no photo type — so they keep the
  // one-step delete instead of a menu with a single destructive item.
  const showActions = () => {
    if (isPhoto || !onSendToFlop) {
      confirmDelete();
      return;
    }
    Alert.alert('Note actions', undefined, [
      { text: 'Send to Flop', onPress: () => onSendToFlop(note) },
      { text: 'Delete…', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={showActions}
        delayLongPress={350}
        style={[styles.bubble, isPhoto && styles.bubblePhoto]}
      >
        {isVoice ? (
          <>
            <VoicePlayerRow note={note} variant="list" />
            <TranscribeButton note={note} tone="list" />
          </>
        ) : isPhoto ? (
          <PhotoGrid uris={media} onOpen={(index) => setViewer({ open: true, index })} />
        ) : (
          <Text style={styles.text}>{note.content}</Text>
        )}
        <View style={styles.footRow}>
          <View style={styles.footRule} />
          <Text style={styles.time}>{formatClock(note.created_at)}</Text>
        </View>
      </TouchableOpacity>

      {isPhoto && media.length > 0 && (
        <PhotoViewer
          uris={media}
          initialIndex={viewer.index}
          visible={viewer.open}
          onClose={() => setViewer((v) => ({ ...v, open: false }))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  bubble: {
    maxWidth: '86%',
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  bubblePhoto: {
    padding: spacing.xs + 2,
    paddingBottom: spacing.sm,
  },
  text: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: type.noteBody,
    lineHeight: 26,
  },
  // Index-card footer: a faint rule running up to the right-set timestamp.
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  footRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  time: {
    fontFamily: fonts.mono,
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
