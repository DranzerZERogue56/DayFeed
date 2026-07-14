import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { parseMediaUris, type Note } from '../db/types';
import { formatClock } from '../utils/date';
import { colors, radius, spacing } from '../theme';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';

interface Props {
  note: Note;
  onDelete: (note: Note) => void;
}

// Chat-style bubble for the Feed. Long-press to delete (with confirm).
export default function NoteBubble({ note, onDelete }: Props) {
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

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={confirmDelete}
        delayLongPress={350}
        style={[styles.bubble, isPhoto && styles.bubblePhoto]}
      >
        {isVoice ? (
          <>
            <VoicePlayerRow note={note} variant="own" />
            <TranscribeButton note={note} tone="own" />
          </>
        ) : isPhoto ? (
          <PhotoGrid uris={media} onOpen={(index) => setViewer({ open: true, index })} />
        ) : (
          <Text style={styles.text}>{note.content}</Text>
        )}
        <Text style={styles.time}>{formatClock(note.created_at)}</Text>
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
    maxWidth: '82%',
    backgroundColor: colors.bubbleOwn,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubblePhoto: {
    padding: spacing.xs + 2,
  },
  text: {
    color: colors.bubbleOwnText,
    fontSize: 16,
    lineHeight: 22,
  },
  time: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
