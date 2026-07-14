import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDayHeader } from '../utils/date';
import { colors, fonts, spacing, type } from '../theme';

interface Props {
  dayKey: string;
  /** Tap to open this day in the Flip notebook. */
  onPress?: (dayKey: string) => void;
}

// The layout signature: a full-width section that *celebrates* the passage of a
// day — large centered serif date framed by hairline rules — rather than a thin
// divider. Tapping carries you into that day in the Flip notebook.
export default function DaySeparator({ dayKey, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress ? () => onPress(dayKey) : undefined}
      style={styles.wrap}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Open ${formatDayHeader(dayKey)} in the notebook` : undefined}
    >
      <View style={styles.rule} />
      <Text style={styles.date}>{formatDayHeader(dayKey)}</Text>
      <View style={styles.rule} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
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
    letterSpacing: 0.3,
  },
});
