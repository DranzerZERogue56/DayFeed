import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CopyIcon, EyeIcon, EyeOffIcon } from './Icons';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  label: string;
  value: string;
  /** Fires after the value reaches the clipboard, so the screen can confirm it. */
  onCopied?: (label: string) => void;
}

const MIN_MASK = 8;
const MAX_MASK = 20;

// One child box: label, the value on a horizontally-scrolling track, then a
// reveal toggle and a copy button.
//
// The pill used to be one big TouchableOpacity that toggled the reveal, with
// the value's ScrollView inside it. Two things were wrong with that, and a long
// password hit both: the value carried `numberOfLines={1}`, which makes Android
// ellipsize to the available width so the scroll content was never wider than
// its viewport and there was nothing to scroll; and the wrapping touchable
// competed with the ScrollView for the horizontal pan. Splitting the actions
// into their own buttons leaves the track free to scroll under your finger.
export default function VaultFieldPill({ label, value, onCopied }: Props) {
  const [revealed, setRevealed] = useState(false);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const masked = '•'.repeat(Math.min(Math.max(value.length, MIN_MASK), MAX_MASK));

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    onCopied?.(label);
  };

  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        // The value can be longer than the pill; let it start where it is
        // readable rather than mid-string after a re-render.
        keyboardShouldPersistTaps="handled"
      >
        {/* No numberOfLines: a horizontal ScrollView gives its child unbounded
            width, so the text lays out at full length and cannot wrap anyway.
            Adding the prop only reintroduces the ellipsis that broke this. */}
        <Text style={styles.value}>{revealed ? value : masked}</Text>
      </ScrollView>

      <TouchableOpacity
        onPress={() => setRevealed((r) => !r)}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        accessibilityLabel={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
      >
        {revealed ? (
          <EyeOffIcon color={colors.textDim} size={16} />
        ) : (
          <EyeIcon color={colors.textDim} size={16} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => void copy()}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        accessibilityLabel={`Copy ${label.toLowerCase()}`}
      >
        <CopyIcon color={colors.accent} size={16} />
      </TouchableOpacity>
    </View>
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
    // flexShrink rather than flex:1 so the track gives way to the buttons
    // instead of pushing them off the end of a narrow card.
    scroll: {
      flexShrink: 1,
      flexGrow: 1,
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
