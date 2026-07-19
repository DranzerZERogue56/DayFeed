import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../hooks/ThemeContext';
import { fonts, ornament, spacing, type, type ColorPalette } from '../theme';

interface Props {
  /** Short italic serif line, e.g. "Nothing captured yet." */
  title: string;
  /** Optional smaller explanation beneath. */
  hint?: string;
}

// Shared empty state: a bronze letterpress ornament over an italic serif line —
// the look of a blank page in a bound book, replacing the old emoji glyphs.
export default function EmptyState({ title, hint }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.ornament}>{ornament}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  ornament: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: 30,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.textDim,
    fontSize: type.label,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    color: colors.textFaint,
    fontSize: type.timestamp,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 280,
  },
  });
