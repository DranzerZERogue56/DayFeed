import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FlopCrumb } from '../db/flopTypes';
import { fonts, spacing, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  /** Ancestors root-first, excluding the current page (it's the headline). */
  ancestors: FlopCrumb[];
  onJump: (id: string) => void;
}

const MAX_CRUMBS = 2;

// Ancestor trail above the headline. Deep paths truncate the middle — `Root › … ›
// Parent` — so the two crumbs that orient you are always the ones you can see.
export default function FlopBreadcrumb({ ancestors, onJump }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  if (ancestors.length === 0) return null;

  const truncated = ancestors.length > MAX_CRUMBS;
  const shown = truncated ? [ancestors[0], ancestors[ancestors.length - 1]] : ancestors;

  return (
    <View style={styles.bar}>
      {shown.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          {i > 0 && <Text style={styles.sep}>›</Text>}
          {/* The ellipsis stands in for the crumbs we dropped; it is not tappable. */}
          {truncated && i === 1 && <Text style={styles.sep}>…›</Text>}
          <TouchableOpacity onPress={() => onJump(crumb.id)} accessibilityRole="link">
            <Text style={styles.crumb} numberOfLines={1}>
              {crumb.title}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  crumb: {
    fontFamily: fonts.mono,
    color: colors.textFaint,
    fontSize: 12,
    maxWidth: 130,
  },
  sep: { fontFamily: fonts.mono, color: colors.textFaint, fontSize: 12 },
});
