import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { fonts, spacing, type, type ColorPalette } from '../theme';
import { MoonIcon, SunIcon } from './Icons';

interface Props {
  /** Mono small-caps eyebrow above the title, e.g. "QUICK CAPTURE". */
  overline: string;
  title: string;
  /** Optional control pinned to the right edge (calendar button, add button…). */
  action?: React.ReactNode;
}

// The one header every tab shares: a bronze mono overline naming the surface's
// job, a serif title beneath — the running head of a book chapter. Keeping this
// identical across screens is what makes the app read as a single bound volume.
// The moon/sun at the right edge flips the whole book between day and night.
export default function ScreenHeader({ overline, title, action }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, mode, toggleMode } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.overline}>{overline.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
      <TouchableOpacity
        onPress={toggleMode}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.themeBtn}
        accessibilityLabel={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {mode === 'light' ? (
          <MoonIcon color={colors.textDim} size={20} />
        ) : (
          <SunIcon color={colors.textDim} size={20} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    textCol: { flex: 1 },
    overline: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: type.overline,
      letterSpacing: 2,
      marginBottom: 2,
    },
    title: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.screenTitle,
      letterSpacing: 0.3,
    },
    themeBtn: { marginLeft: spacing.md, padding: 2 },
  });
