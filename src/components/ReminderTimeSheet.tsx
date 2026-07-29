import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE } from '../lib/reminders';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  initialHour?: number | null;
  initialMinute?: number | null;
  onCancel: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Cross-platform time picker for an agenda reminder. Android's native dialog
// carries its own OK/Cancel chrome and dismisses itself on either choice; iOS's
// inline spinner has no chrome of its own, so it gets a sheet wrapper with an
// explicit Cancel/Set row.
export default function ReminderTimeSheet({
  visible,
  initialHour,
  initialMinute,
  onCancel,
  onConfirm,
}: Props) {
  const styles = useStyles(makeStyles);
  const initial = timeToDate(
    initialHour ?? DEFAULT_REMINDER_HOUR,
    initialMinute ?? DEFAULT_REMINDER_MINUTE,
  );
  const [draft, setDraft] = useState(initial);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={initial}
        mode="time"
        onChange={(event, date) => {
          if (event.type === 'set' && date) onConfirm(date.getHours(), date.getMinutes());
          else onCancel();
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Remind me at</Text>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            onChange={(_, date) => date && setDraft(date)}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} accessibilityLabel="Cancel">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(draft.getHours(), draft.getMinutes())}
              accessibilityLabel="Set reminder time"
            >
              <Text style={styles.confirm}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    title: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.label,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    cancel: { fontFamily: fonts.body, color: colors.textDim, fontSize: 16 },
    confirm: { fontFamily: fonts.body, color: colors.accent, fontSize: 16, fontWeight: '700' },
  });
