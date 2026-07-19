import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { flopTitle, type FlopChildRelation, type FlopNote } from '../db/flopTypes';
import { CHILD_RELATIONS } from '../db/flopTypes';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme'; // relationStyle now via useTheme()
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  /** The child being acted on; null closes the sheet. */
  child: FlopNote | null;
  /** Position within its own relation group, for the move affordances. */
  index: number;
  groupSize: number;
  onClose: () => void;
  onChangeRelation: (relation: FlopChildRelation) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}

// Long-press menu for a child: change relation, reorder among siblings, delete.
//
// A custom sheet rather than Alert.alert: Android's alert renders at most three
// buttons and silently drops the rest, and this menu needs up to six.
export default function FlopChildActions({
  child,
  index,
  groupSize,
  onClose,
  onChangeRelation,
  onMove,
  onDelete,
}: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  if (!child) return null;

  const others = CHILD_RELATIONS.filter((r) => r !== child.relation);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the sheet itself so only the backdrop dismisses. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} numberOfLines={2}>
            {flopTitle(child)}
          </Text>

          {others.map((r) => {
            const s = relationStyle[r];
            return (
              <TouchableOpacity key={r} style={styles.row} onPress={() => onChangeRelation(r)}>
                <Text style={[styles.rowIcon, { color: s.color }]}>{s.icon}</Text>
                <Text style={styles.rowText}>Make {s.label}</Text>
              </TouchableOpacity>
            );
          })}

          {index > 0 && (
            <TouchableOpacity style={styles.row} onPress={() => onMove('up')}>
              <Text style={styles.rowIcon}>↑</Text>
              <Text style={styles.rowText}>Move up</Text>
            </TouchableOpacity>
          )}
          {index < groupSize - 1 && (
            <TouchableOpacity style={styles.row} onPress={() => onMove('down')}>
              <Text style={styles.rowIcon}>↓</Text>
              <Text style={styles.rowText}>Move down</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.row} onPress={onDelete}>
            <Text style={[styles.rowIcon, styles.danger]}>✕</Text>
            <Text style={[styles.rowText, styles.danger]}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.row, styles.cancel]} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.35)',
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
  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.label,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowIcon: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDim,
    width: 20,
    textAlign: 'center',
  },
  rowText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  danger: { color: colors.danger },
  cancel: { justifyContent: 'center' },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDim,
  },
});
