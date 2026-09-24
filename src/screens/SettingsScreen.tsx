import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  accentOrder,
  accentThemes,
  fonts,
  radius,
  spacing,
  themeSwatch,
  type,
  type ColorPalette,
} from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES: { value: 'light' | 'dark'; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Settings. A screen rather than a sheet, but presented as a full-screen modal
// from Feed's header — the tab bar is full at seven, and RootTabs already
// records that the seventh truncated "View All" to "View …".
export default function SettingsScreen({ visible, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { mode, setMode, accentId, setAccentId } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back to Feed">
            <Text style={styles.back}>‹ Feed</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>APPEARANCE</Text>
          <Text style={styles.sectionHint}>
            Light is paper in daylight. Dark is the same book after sundown, easier on the
            eyes at night. The sun and moon button at the top of the Feed switches this too.
          </Text>

          <View style={styles.modeRow}>
            {MODES.map((option) => {
              const selected = mode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modeOption, selected && styles.modeOptionSelected]}
                  onPress={() => setMode(option.value)}
                  accessibilityLabel={`Use ${option.label.toLowerCase()} mode`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>COLOR THEME</Text>
          <Text style={styles.sectionHint}>
            Recolors the whole app — the page, the cards and the ink, not just the buttons.
            Each theme has seven colors, one for each tab, shown when you're on it.
            Bronze is the original look.
          </Text>

          <View style={styles.swatchRow}>
            {accentOrder.map((id) => {
              const theme = accentThemes[id];
              const palette = theme[mode];
              // The tile is the theme's own page color with its seven scheme
              // colors sitting on it — what you'd actually be switching to,
              // rather than a single dot that can't show the difference.
              const scheme = themeSwatch(id, mode);
              const selected = accentId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.swatchItem}
                  onPress={() => setAccentId(id)}
                  accessibilityLabel={`Use ${theme.label} theme`}
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: palette.bg, borderColor: palette.divider },
                      selected && { borderColor: palette.accent },
                    ]}
                  >
                    <View style={styles.swatchDots}>
                      {scheme.map((c, i) => (
                        <View key={i} style={[styles.swatchDot, { backgroundColor: c }]} />
                      ))}
                    </View>
                    {selected && (
                      <Text style={[styles.swatchTick, { color: palette.accent }]}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.swatchLabel}>{theme.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    title: { fontFamily: fonts.display, color: colors.text, fontSize: type.label },
    back: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
    // Balances the back button so the title stays optically centred.
    headerSpacer: { width: 52 },
    body: { padding: spacing.lg, paddingBottom: spacing.xl },
    sectionLabel: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
    },
    sectionHint: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.xl,
    },
    swatchItem: {
      width: '33.33%',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    swatch: {
      width: 96,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    swatchDots: {
      flexDirection: 'row',
      gap: 4,
    },
    swatchDot: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
    },
    swatchTick: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
    swatchLabel: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 11,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    modeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    modeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      backgroundColor: colors.surface,
    },
    modeOptionSelected: {
      borderColor: colors.accentEdge,
      backgroundColor: colors.accentTint,
    },
    modeLabel: { fontFamily: fonts.display, color: colors.text, fontSize: 16 },
    modeLabelSelected: { color: colors.accent },
  });
