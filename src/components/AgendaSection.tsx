import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AgendaEntry } from '../db';
import { notePreview } from '../utils/notePreview';
import { colors, fonts, radius, spacing, type } from '../theme';

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
    backgroundColor: colors.accentTint,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentEdge,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: type.timestamp,
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
    backgroundColor: colors.accent,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  body: { flex: 1 },
  snippet: {
    fontFamily: fonts.body,
    color: colors.pageText,
    fontSize: type.timestamp,
    fontWeight: '600',
  },
  source: {
    fontFamily: fonts.mono,
    color: colors.pageDim,
    fontSize: 12,
    marginTop: 2,
  },
});
