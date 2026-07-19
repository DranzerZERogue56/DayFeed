import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDayNotes, useDetectedDatesForDay } from '../hooks/useQueries';
import { parseMediaUris } from '../db/types';
import { formatClock, formatDayHeader } from '../utils/date';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import AgendaSection from './AgendaSection';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';

// One notebook "page" for a single calendar day. Shows an Agenda section for
// dates that refer to this day, then the notes written on it. Empty days render a
// blank page to preserve the paper-notebook flip feel.
export default function DayPage({ dayKey }: { dayKey: string }) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { notes } = useDayNotes(dayKey);
  const agenda = useDetectedDatesForDay(dayKey);
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);

  const isBlank = notes.length === 0 && agenda.length === 0;

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
            contentContainerStyle={styles.entries}
            showsVerticalScrollIndicator={false}
          >
            <AgendaSection entries={agenda} />
            {notes.map((n) => {
              const media = n.type === 'photo' ? parseMediaUris(n) : [];
              return (
                <View key={n.id} style={styles.entry}>
                  <Text style={styles.time}>{formatClock(n.created_at)}</Text>
                  {n.type === 'voice' ? (
                    <View style={styles.voiceWrap}>
                      <VoicePlayerRow note={n} variant="paper" />
                      <TranscribeButton note={n} tone="paper" />
                    </View>
                  ) : n.type === 'photo' ? (
                    <PhotoGrid
                      uris={media}
                      onOpen={(index) => setViewer({ uris: media, index })}
                    />
                  ) : (
                    <Text style={styles.entryText}>{n.content}</Text>
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
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.pageLine,
    paddingBottom: spacing.md,
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
