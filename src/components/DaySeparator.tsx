import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDayHeader } from '../utils/date';
import { useStyles } from '../hooks/ThemeContext';
import { fonts, spacing, type ColorPalette } from '../theme';

interface Props {
  dayKey: string;
  /** Tap to open this day in the Flip notebook. */
  onPress?: (dayKey: string) => void;
}

// A quiet marker between days: a small mono date set into a hairline rule.
// It used to be a full serif banner with a letterpress ornament, which cost as
// much height as two short notes — too loud for a surface you scan. Tapping
// still opens the day in the Flip notebook, where the ceremony belongs.
export default function DaySeparator({ dayKey, onPress }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress ? () => onPress(dayKey) : undefined}
      style={styles.wrap}
      // The row is only ~25dp tall now — too short to hit reliably on its own.
      hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Open ${formatDayHeader(dayKey)} in the notebook` : undefined}
    >
      <View style={styles.row}>
        <View style={styles.rule} />
        <Text style={styles.date}>{formatDayHeader(dayKey)}</Text>
        <View style={styles.rule} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
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
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textDim,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  });
