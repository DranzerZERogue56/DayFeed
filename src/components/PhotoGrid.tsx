import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { radius, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  uris: string[];
  onOpen: (index: number) => void;
  /** Max thumbnails before collapsing into a "+N" badge. */
  maxVisible?: number;
  size?: number;
}

// Thumbnail grid for a photo note. Shows up to `maxVisible` images; the last tile
// carries a "+N" overflow badge when there are more.
export default function PhotoGrid({ uris, onOpen, maxVisible = 4, size = 76 }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  if (uris.length === 0) return null;
  const visible = uris.slice(0, maxVisible);
  const overflow = uris.length - visible.length;

  return (
    <View style={styles.grid}>
      {visible.map((uri, i) => {
        const isLast = i === visible.length - 1;
        const showBadge = isLast && overflow > 0;
        return (
          <TouchableOpacity
            key={uri}
            activeOpacity={0.85}
            onPress={() => onOpen(i)}
            style={[styles.cell, { width: size, height: size }]}
          >
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            {showBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+{overflow}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
});
