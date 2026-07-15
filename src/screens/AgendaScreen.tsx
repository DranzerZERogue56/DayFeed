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
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { colors, fonts, radius, shadows, spacing, type } from '../theme';

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
      <ScreenHeader overline="Dates found in your notes" title="Agenda" />

      {sections.length === 0 ? (
        <EmptyState
          title="No upcoming dates yet."
          hint="Mention a date in a note — like “call Sam next Friday” — and it shows up here."
        />
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
  listContent: { padding: spacing.md },
  sectionHeader: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: type.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  // A bronze left edge marks "this row points somewhere" — the same cue as
  // Flop's relation-colored child cards.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  rowBody: { flex: 1 },
  snippet: { fontFamily: fonts.body, color: colors.text, fontSize: type.label, fontWeight: '700' },
  source: { fontFamily: fonts.body, color: colors.textDim, fontSize: 13, marginTop: 2 },
  written: { fontFamily: fonts.mono, color: colors.textFaint, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.accent, fontSize: 24, marginLeft: spacing.sm },
});
