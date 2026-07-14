import React, { useMemo } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAgendaEntries } from '../hooks/useQueries';
import type { AgendaEntry } from '../db';
import type { RootTabParamList } from '../navigation/types';
import { notePreview } from '../utils/notePreview';
import { formatClock, formatDayHeader } from '../utils/date';
import { colors, fonts, radius, spacing, type } from '../theme';

interface Section {
  dayKey: string;
  data: AgendaEntry[];
}

// Agenda: a chronological timeline of every detected date, grouped by the day it
// refers to. Tapping a row jumps to that note's day page in the Flip tab.
export default function AgendaScreen() {
  const { entries } = useAgendaEntries();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const sections = useMemo<Section[]>(() => {
    const byDay = new Map<string, AgendaEntry[]>();
    for (const e of entries) {
      const arr = byDay.get(e.date_key);
      if (arr) arr.push(e);
      else byDay.set(e.date_key, [e]);
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([dayKey, data]) => ({ dayKey, data }));
  }, [entries]);

  const openInFlip = (entry: AgendaEntry) => {
    // Navigate to the day the source note lives on (its own day_key).
    navigation.navigate('Flip', { jumpTo: entry.note.day_key, ts: Date.now() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>Dates found in your notes</Text>
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyGlyph}>🗓️</Text>
          <Text style={styles.emptyTitle}>No upcoming dates yet</Text>
          <Text style={styles.emptyBody}>
            Mention a date in a note — like “call Sam next Friday” — and it shows up
            here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{formatDayHeader(section.dayKey)}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => openInFlip(item)}
            >
              <View style={styles.dot} />
              <View style={styles.rowBody}>
                <Text style={styles.snippet}>{item.snippet}</Text>
                <Text style={styles.source} numberOfLines={1}>
                  {notePreview(item.note)}
                </Text>
                <Text style={styles.written}>
                  written {formatDayHeader(item.note.day_key)} · {formatClock(item.note.created_at)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.screenTitle,
    letterSpacing: 0.3,
  },
  subtitle: { fontFamily: fonts.body, color: colors.textDim, fontSize: type.caption, marginTop: 2 },
  listContent: { padding: spacing.md },
  sectionHeader: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: type.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.md,
  },
  rowBody: { flex: 1 },
  snippet: { fontFamily: fonts.body, color: colors.text, fontSize: type.label, fontWeight: '700' },
  source: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 2 },
  written: { fontFamily: fonts.mono, color: colors.textFaint, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.accent, fontSize: 24, marginLeft: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyGlyph: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.display, color: colors.text, fontSize: type.noteBody },
  emptyBody: {
    fontFamily: fonts.body,
    color: colors.textDim,
    fontSize: type.timestamp,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
