import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDayNotes, useDetectedDatesForDay } from '../hooks/useQueries';
import { useNotes } from '../hooks/NotesContext';
import { parseMediaUris, type Note } from '../db/types';
import { toggleCheckboxLine } from '../lib/markdownList';
import { formatClock, formatDayHeader } from '../utils/date';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import AgendaSection from './AgendaSection';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';
import OcrControl from './OcrControl';
import MarkdownText from './MarkdownText';

// A photo entry's body: thumbnails + OCR control, with its own collapse
// state (each entry needs one, so this can't be inlined into the notes.map —
// hooks require an actual component).
function PhotoEntryBody({
  note,
  onOpen,
  styles,
}: {
  note: Note;
  onOpen: (index: number) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { saveOcrText } = useNotes();
  const [collapsed, setCollapsed] = useState(false);
  const media = parseMediaUris(note);

  if (note.ocr_text) {
    return (
      <>
        <OcrControl
          mediaUris={media}
          ocrText={note.ocr_text}
          onExtracted={(text) => saveOcrText(note, text)}
        />
        <TouchableOpacity onPress={() => setCollapsed((c) => !c)}>
          <Text style={styles.toggleLink}>
            {collapsed ? `Show photos (${media.length})` : 'Hide photos'}
          </Text>
        </TouchableOpacity>
        {!collapsed && (
          <View style={styles.photosGap}>
            <PhotoGrid uris={media} onOpen={onOpen} />
          </View>
        )}
      </>
    );
  }

  return (
    <>
      <PhotoGrid uris={media} onOpen={onOpen} />
      <OcrControl
        mediaUris={media}
        ocrText={note.ocr_text}
        onExtracted={(text) => saveOcrText(note, text)}
      />
    </>
  );
}

interface Props {
  dayKey: string;
  /** A note to flash green on arrival — e.g. jumping here from an Agenda tap. */
  highlightNoteId?: string;
  /** Changes on every jump so re-tapping the same Agenda entry re-triggers the flash. */
  highlightToken?: number;
}

// One notebook "page" for a single calendar day. Shows an Agenda section for
// dates that refer to this day, then the notes written on it. Empty days render a
// blank page to preserve the paper-notebook flip feel.
export default function DayPage({ dayKey, highlightNoteId, highlightToken }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { notes } = useDayNotes(dayKey);
  const agenda = useDetectedDatesForDay(dayKey);
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  const { editNoteContent } = useNotes();

  const isBlank = notes.length === 0 && agenda.length === 0;

  // Attention flash for a note jumped to from Agenda: a green tint that fades
  // out, plus a scroll to bring it into view. Support's moss green is reused
  // here rather than adding a new color to the palette.
  const scrollRef = useRef<ScrollView>(null);
  const entryOffsets = useRef<Record<string, number>>({});
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [flashingId, setFlashingId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightNoteId) return;
    setFlashingId(highlightNoteId);
    highlightAnim.setValue(1);
    const scrollTimer = setTimeout(() => {
      const y = entryOffsets.current[highlightNoteId];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
    }, 60);
    const fade = Animated.timing(highlightAnim, {
      toValue: 0,
      duration: 900,
      delay: 700,
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) setFlashingId(null);
    });
    return () => {
      clearTimeout(scrollTimer);
      fade.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightNoteId, highlightToken]);

  return (
    <View style={styles.page}>
      <View style={styles.sheet}>
        <View style={styles.marginLine} />
        <Text style={styles.dateStamp}>{formatDayHeader(dayKey)}</Text>
        {isBlank ? (
          <View style={styles.blank}>
            <Text style={styles.blankText}>A blank page.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.entries}
            showsVerticalScrollIndicator={false}
          >
            <AgendaSection entries={agenda} />
            {notes.map((n) => {
              return (
                <View
                  key={n.id}
                  style={styles.entry}
                  onLayout={(e) => {
                    entryOffsets.current[n.id] = e.nativeEvent.layout.y;
                  }}
                >
                  {flashingId === n.id && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.highlight,
                        {
                          backgroundColor: relationStyle.support.color,
                          opacity: highlightAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.32],
                          }),
                        },
                      ]}
                    />
                  )}
                  <Text style={styles.time}>{formatClock(n.created_at)}</Text>
                  {n.type === 'voice' ? (
                    <View style={styles.voiceWrap}>
                      <VoicePlayerRow note={n} variant="paper" />
                      <TranscribeButton note={n} tone="paper" />
                    </View>
                  ) : n.type === 'photo' ? (
                    <PhotoEntryBody
                      note={n}
                      onOpen={(index) => setViewer({ uris: parseMediaUris(n), index })}
                      styles={styles}
                    />
                  ) : (
                    <MarkdownText
                      content={n.content ?? ''}
                      textStyle={styles.entryText}
                      onToggleCheckbox={(lineIndex) =>
                        editNoteContent(n, toggleCheckboxLine(n.content ?? '', lineIndex))
                      }
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {viewer && (
        <PhotoViewer
          uris={viewer.uris}
          initialIndex={viewer.index}
          visible={!!viewer}
          onClose={() => setViewer(null)}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20, // portrait-page margins on either side
    paddingVertical: spacing.md,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.page,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    paddingVertical: spacing.xl,
    paddingLeft: spacing.xl + spacing.sm,
    paddingRight: spacing.xl,
    overflow: 'hidden',
    ...shadows.sheet,
  },
  marginLine: {
    position: 'absolute',
    left: spacing.lg,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: colors.accentEdge,
  },
  dateStamp: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: type.timestamp,
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  entries: {
    paddingBottom: spacing.xl,
  },
  entry: {
    position: 'relative',
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.pageLine,
    paddingBottom: spacing.md,
  },
  highlight: {
    position: 'absolute',
    top: -8,
    left: -12,
    right: -12,
    bottom: -4,
    borderRadius: radius.sm,
  },
  time: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 11,
    marginBottom: 3,
  },
  entryText: {
    fontFamily: fonts.body,
    color: colors.pageText,
    fontSize: type.noteBody,
    lineHeight: 26,
  },
  voiceWrap: {
    marginTop: 4,
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
  blank: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankText: {
    fontFamily: fonts.display,
    color: colors.pageDim,
    fontSize: type.label,
    fontStyle: 'italic',
  },
});
