import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDayHeader } from '../utils/date';
import { colors, fonts, ornament, spacing, type } from '../theme';

interface Props {
  dayKey: string;
  /** Tap to open this day in the Flip notebook. */
  onPress?: (dayKey: string) => void;
}

// The layout signature: a full-width section that *celebrates* the passage of a
// day rather than a thin divider — centered serif date over a bronze letterpress
// ornament, framed by hairline rules. Tapping opens the day in the Flip notebook.
export default function DaySeparator({ dayKey, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress ? () => onPress(dayKey) : undefined}
      style={styles.wrap}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Open ${formatDayHeader(dayKey)} in the notebook` : undefined}
    >
      <View style={styles.row}>
        <View style={styles.rule} />
        <Text style={styles.date}>{formatDayHeader(dayKey)}</Text>
        <View style={styles.rule} />
      </View>
      <Text style={styles.ornament}>{ornament}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  date: {
    fontFamily: fonts.display,
    fontSize: type.sectionTitle,
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    letterSpacing: 0.4,
  },
  ornament: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
});
