import React from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

export interface NoteAction {
  label: string;
  onPress: () => void;
  /** Marks a destructive action (delete…) in the app's danger tone. */
  danger?: boolean;
}

interface Props {
  visible: boolean;
  /** Optional short line identifying what the actions apply to. */
  subtitle?: string;
  actions: NoteAction[];
  onClose: () => void;
}

// Themed replacement for Alert.alert's action menu: the OS dialog is drawn by
// the system and ignores DayFeed's light/dark palette entirely — it looks
// jarring against the "bookbinding" surfaces (a stark system-gray box in the
// middle of the dark leather theme). This bottom sheet reuses FlopChildActions'
// pattern so every long-press menu in the app shares one themed look.
export default function NoteActionsSheet({ visible, subtitle, actions, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const runAndClose = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the sheet itself so only the backdrop dismisses.
            Bottom padding adds the safe-area inset on top of the sheet's own
            spacing — Android's edge-to-edge gesture bar otherwise overlaps
            (and on 3-button nav, covers) the Cancel row. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}
          onPress={() => {}}
        >
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}

          {actions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => runAndClose(a.onPress)}
            >
              <Text style={[styles.rowText, a.danger && styles.danger]}>{a.label}</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [styles.row, styles.cancel, pressed && styles.rowPressed]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    subtitle: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: type.timestamp,
      marginBottom: spacing.sm,
    },
    row: {
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowText: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
    danger: { color: colors.danger, fontWeight: '700' },
    cancel: { alignItems: 'center' },
    cancelText: {
      fontFamily: fonts.body,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textDim,
    },
  });
