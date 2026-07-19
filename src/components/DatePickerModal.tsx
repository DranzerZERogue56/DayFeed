import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { dateFromDayKey, dayKeyFromDate, todayKey } from '../utils/date';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  /** Currently displayed day, controls the initial month. */
  selectedKey: string;
  /** Days that contain notes — shown with a dot. */
  markedKeys: Set<string>;
  onSelect: (dayKey: string) => void;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Minimal month-grid picker so Flip can jump to any date without a new dependency.
export default function DatePickerModal({
  visible,
  selectedKey,
  markedKeys,
  onSelect,
  onClose,
}: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const initial = dateFromDayKey(selectedKey);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  // Re-sync the month view whenever the modal reopens on a new day.
  React.useEffect(() => {
    if (visible) {
      const d = dateFromDayKey(selectedKey);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  }, [visible, selectedKey]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(dayKeyFromDate(new Date(year, month, d)));
    }
    return out;
  }, [year, month]);

  const shiftMonth = (delta: number) => {
    const m = month + delta;
    const d = new Date(year, m, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const today = todayKey();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Text style={styles.nav}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headTitle}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={12}>
              <Text style={styles.nav}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEK.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((key, i) => {
              if (!key) return <View key={i} style={styles.cell} />;
              const isSelected = key === selectedKey;
              const isToday = key === today;
              const marked = markedKeys.has(key);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => onSelect(key)}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isToday && styles.cellTextToday,
                      isSelected && styles.cellTextSelected,
                    ]}
                  >
                    {Number(key.slice(-2))}
                  </Text>
                  <View style={[styles.dot, marked && styles.dotOn]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.todayBtn} onPress={() => onSelect(today)}>
            <Text style={styles.todayBtnText}>Jump to Today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL = `${100 / 7}%`;

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  // Warm ink scrim — same as the Flop action sheet, never pure black.
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    ...shadows.sheet,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.sectionTitle,
    letterSpacing: 0.3,
  },
  nav: { color: colors.accent, fontSize: 28, fontWeight: '700', paddingHorizontal: spacing.sm },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    fontFamily: fonts.mono,
    width: CELL,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  cellText: { fontFamily: fonts.mono, color: colors.text, fontSize: 15 },
  cellTextToday: { color: colors.accent, fontWeight: '800' },
  cellTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  dotOn: { backgroundColor: colors.accent },
  todayBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
    borderRadius: radius.md,
  },
  todayBtnText: { fontFamily: fonts.body, color: colors.accent, fontWeight: '700', fontSize: 15 },
});
