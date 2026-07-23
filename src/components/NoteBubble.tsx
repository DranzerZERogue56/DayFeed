import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { parseMediaUris, type Note } from '../db/types';
import { formatClock } from '../utils/date';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { useNotes } from '../hooks/NotesContext';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import OcrControl from './OcrControl';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';
import NoteActionsSheet from './NoteActionsSheet';

interface Props {
  note: Note;
  onDelete: (note: Note) => void;
  /** Absent for photo notes' callers or when promotion isn't offered. */
  onSendToFlop?: (note: Note) => void;
}

// Chat-style bubble for the Feed. Long-press for actions (send to Flop, delete).
export default function NoteBubble({ note, onDelete, onSendToFlop }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { saveOcrText } = useNotes();
  const isVoice = note.type === 'voice';
  const isPhoto = note.type === 'photo';
  const media = isPhoto ? parseMediaUris(note) : [];
  const [viewer, setViewer] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const [sheet, setSheet] = useState<'menu' | 'confirm' | null>(null);
  const [photosCollapsed, setPhotosCollapsed] = useState(false);

  const deleteDetail = isVoice
    ? 'This voice note will be permanently removed.'
    : isPhoto
      ? 'This photo note and its images will be permanently removed.'
      : 'This note will be permanently removed.';

  // Photo notes can't be promoted — Flop has no photo type — so they keep the
  // one-step delete instead of a menu with a single destructive item.
  const showActions = () => {
    setSheet(isPhoto || !onSendToFlop ? 'confirm' : 'menu');
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
          <>
            {note.ocr_text ? (
              <>
                <OcrControl
                  mediaUris={media}
                  ocrText={note.ocr_text}
                  onExtracted={(text) => saveOcrText(note, text)}
                />
                <TouchableOpacity onPress={() => setPhotosCollapsed((c) => !c)}>
                  <Text style={styles.toggleLink}>
                    {photosCollapsed ? `Show photos (${media.length})` : 'Hide photos'}
                  </Text>
                </TouchableOpacity>
                {!photosCollapsed && (
                  <View style={styles.photosGap}>
                    <PhotoGrid uris={media} onOpen={(index) => setViewer({ open: true, index })} />
                  </View>
                )}
              </>
            ) : (
              <>
                <PhotoGrid uris={media} onOpen={(index) => setViewer({ open: true, index })} />
                <OcrControl
                  mediaUris={media}
                  ocrText={note.ocr_text}
                  onExtracted={(text) => saveOcrText(note, text)}
                />
              </>
            )}
          </>
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

      <NoteActionsSheet
        visible={sheet === 'menu'}
        actions={[
          { label: 'Send to Flop', onPress: () => onSendToFlop?.(note) },
          { label: 'Delete…', danger: true, onPress: () => setSheet('confirm') },
        ]}
        onClose={() => setSheet(null)}
      />
      <NoteActionsSheet
        visible={sheet === 'confirm'}
        subtitle={deleteDetail}
        actions={[{ label: 'Delete', danger: true, onPress: () => onDelete(note) }]}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
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
  toggleLink: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  photosGap: {
    marginTop: spacing.sm,
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
