import React, { useMemo } from 'react';
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNotes } from '../hooks/NotesContext';
import { useAgendaEntries } from '../hooks/useQueries';
import { setDetectedDateReminder, type AgendaEntry } from '../db';
import { cancelReminder, ensureReminderPermission, scheduleReminder } from '../lib/reminders';
import type { RootTabParamList } from '../navigation/types';
import { notePreview } from '../utils/notePreview';
import { formatClock, formatDayHeader, todayKey } from '../utils/date';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { BellFilledIcon, BellIcon } from '../components/Icons';

interface Section {
  dayKey: string;
  data: AgendaEntry[];
}

// Agenda: a chronological timeline of every detected date, grouped by the day it
// refers to. Tapping a row jumps to that note's day page in the Flip tab.
export default function AgendaScreen() {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { entries } = useAgendaEntries();
  const { refresh } = useNotes();
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

  const toggleReminder = async (entry: AgendaEntry) => {
    if (entry.reminder_id) {
      await cancelReminder(entry.reminder_id);
      await setDetectedDateReminder(entry.id, null);
    } else {
      if (!(await ensureReminderPermission())) {
        Alert.alert(
          'Notifications are off',
          'Enable notifications for DayFeed in Android Settings to use reminders.',
        );
        return;
      }
      const rid = await scheduleReminder(entry.date_key, entry.snippet);
      if (!rid) {
        Alert.alert('Too late to remind', 'Reminders fire at 9:00 AM, and that morning has passed.');
        return;
      }
      await setDetectedDateReminder(entry.id, rid);
    }
    refresh();
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
                  {item.reminder_id ? '  ·  reminder 9:00 AM' : ''}
                </Text>
              </View>
              {item.date_key >= todayKey() && (
                <TouchableOpacity
                  onPress={() => void toggleReminder(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.bellWrap}
                >
                  {item.reminder_id ? (
                    <BellFilledIcon color={colors.accent} size={20} />
                  ) : (
                    <BellIcon color={colors.textFaint} size={20} />
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
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
  bellWrap: { marginLeft: spacing.sm, padding: 2 },
  bell: { fontSize: 18 },
  // Off state: greyed out, like an unlit lamp on the same shelf.
  bellOff: { opacity: 0.25 },
});
