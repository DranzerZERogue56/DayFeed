import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, type } from '../theme';

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
export default function ScreenHeader({ overline, title, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.overline}>{overline.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
