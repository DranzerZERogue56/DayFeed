import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDayHeader } from '../utils/date';
import { colors, radius, spacing } from '../theme';

// Centered date pill shown between notes from different days in the Feed.
export default function DaySeparator({ dayKey }: { dayKey: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.text}>{formatDayHeader(dayKey)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  text: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
});
