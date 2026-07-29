import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

interface Props {
  label: string;
  value: string;
}

const MIN_MASK = 8;
const MAX_MASK = 20;

// One child box: a horizontally-scrolling pill (long values scroll under your
// finger instead of wrapping) that's masked until tapped, then unfurls to show
// the real value. Tapping again re-masks it.
export default function VaultFieldPill({ label, value }: Props) {
  const [revealed, setRevealed] = useState(false);
  const styles = useStyles(makeStyles);
  const masked = '•'.repeat(Math.min(Math.max(value.length, MIN_MASK), MAX_MASK));

  return (
    <TouchableOpacity
      style={styles.pill}
      activeOpacity={0.7}
      onPress={() => setRevealed((r) => !r)}
      accessibilityLabel={`${label}, ${revealed ? 'shown' : 'hidden'}. Tap to ${revealed ? 'hide' : 'show'}.`}
    >
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.value} numberOfLines={1}>
          {revealed ? value : masked}
        </Text>
      </ScrollView>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
      paddingRight: spacing.sm,
    },
    value: {
      fontFamily: fonts.mono,
      color: colors.text,
      fontSize: type.timestamp,
    },
  });
