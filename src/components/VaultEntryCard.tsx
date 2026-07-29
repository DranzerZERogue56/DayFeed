import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { VaultEntry } from '../lib/vaultStore';
import VaultFieldPill from './VaultFieldPill';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

interface Props {
  entry: VaultEntry;
  onOpenActions: (entry: VaultEntry) => void;
}

// The parent box: what the credentials are for, plus its two unfurl-able
// child boxes (username, password).
export default function VaultEntryCard({ entry, onOpenActions }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label} numberOfLines={2}>
          {entry.label}
        </Text>
        <TouchableOpacity
          onPress={() => onOpenActions(entry)}
          hitSlop={10}
          accessibilityLabel={`Actions for ${entry.label}`}
        >
          <Text style={styles.kebab}>⋯</Text>
        </TouchableOpacity>
      </View>
      <VaultFieldPill label="USERNAME" value={entry.username} />
      <VaultFieldPill label="PASSWORD" value={entry.password} />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      ...shadows.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    label: {
      flex: 1,
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.label,
    },
    kebab: {
      fontFamily: fonts.body,
      color: colors.textFaint,
      fontSize: 18,
      fontWeight: '700',
      paddingHorizontal: spacing.xs,
    },
  });
