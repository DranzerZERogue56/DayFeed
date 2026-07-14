import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AgendaEntry } from '../db';
import { notePreview } from '../utils/notePreview';
import { colors, radius, spacing } from '../theme';

// Top-of-page "Agenda" section on a Flip day page: detected dates that *refer to*
// this day, even though the source note may have been written on another day.
export default function AgendaSection({ entries }: { entries: AgendaEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>📅 Agenda</Text>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <View style={styles.bullet} />
          <View style={styles.body}>
            <Text style={styles.snippet}>{e.snippet}</Text>
            <Text style={styles.source} numberOfLines={1}>
              from: {notePreview(e.note)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(42,110,240,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(42,110,240,0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heading: {
    color: colors.bubbleOwn,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bubbleOwn,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  body: { flex: 1 },
  snippet: {
    color: colors.pageText,
    fontSize: 14,
    fontWeight: '600',
  },
  source: {
    color: colors.pageDim,
    fontSize: 12,
    marginTop: 1,
  },
});
