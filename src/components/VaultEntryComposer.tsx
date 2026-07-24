import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { VaultEntry } from '../lib/vaultStore';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  /** Null composes a new entry; an entry pre-fills the form for editing. */
  editing: VaultEntry | null;
  onSave: (label: string, username: string, password: string) => Promise<void>;
  onClose: () => void;
}

export default function VaultEntryComposer({ visible, editing, onSave, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (visible) {
      setLabel(editing?.label ?? '');
      setUsername(editing?.username ?? '');
      setPassword(editing?.password ?? '');
    }
  }, [visible, editing]);

  const canSave = label.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  const save = async () => {
    if (!canSave) return;
    await onSave(label.trim(), username.trim(), password);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Cancel">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editing ? 'Edit entry' : 'New entry'}</Text>
          <TouchableOpacity onPress={save} disabled={!canSave} accessibilityLabel="Save entry">
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.body} behavior="padding">
          <Text style={styles.fieldLabel}>WHAT'S THIS FOR</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Bank of America"
            placeholderTextColor={colors.textFaint}
            autoFocus={!editing}
          />

          <Text style={styles.fieldLabel}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username or email"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </KeyboardAvoidingView>
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
    cancel: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
    save: { fontFamily: fonts.body, color: colors.accent, fontSize: 15, fontWeight: '700' },
    saveDisabled: { color: colors.textFaint },
    body: { flex: 1, padding: spacing.lg },
    fieldLabel: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
      marginBottom: spacing.xs,
      marginTop: spacing.lg,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      padding: spacing.md,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.text,
    },
  });
