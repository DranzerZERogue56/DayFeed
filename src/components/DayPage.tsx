import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDayNotes, useDetectedDatesForDay } from '../hooks/useQueries';
import { parseMediaUris } from '../db/types';
import { formatClock, formatDayHeader } from '../utils/date';
import { colors, radius, spacing } from '../theme';
import VoicePlayerRow from './VoicePlayerRow';
import TranscribeButton from './TranscribeButton';
import AgendaSection from './AgendaSection';
import PhotoGrid from './PhotoGrid';
import PhotoViewer from './PhotoViewer';

// One notebook "page" for a single calendar day. Shows an Agenda section for
// dates that refer to this day, then the notes written on it. Empty days render a
// blank page to preserve the paper-notebook flip feel.
export default function DayPage({ dayKey }: { dayKey: string }) {
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.page,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.xl + spacing.md,
    paddingRight: spacing.lg,
    overflow: 'hidden',
  },
  marginLine: {
    position: 'absolute',
    left: spacing.xl,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(240,82,110,0.35)',
  },
  dateStamp: {
    color: colors.pageDim,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  entries: {
    paddingBottom: spacing.xl,
  },
  entry: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.pageLine,
    paddingBottom: spacing.sm,
  },
  time: {
    color: colors.pageDim,
    fontSize: 11,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  entryText: {
    color: colors.pageText,
    fontSize: 16,
    lineHeight: 24,
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
    color: colors.pageDim,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
