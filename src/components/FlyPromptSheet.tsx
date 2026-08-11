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
import { getSetting, setSetting } from '../db/settings';
import { DEFAULT_FLY_PROMPT } from '../lib/flyPrompt';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

/** Settings key holding the user's engine prompt. Absent means the default. */
export const FLY_PROMPT_KEY = 'fly.prompt';

/** The stored prompt, falling back to the default. */
export async function loadFlyPrompt(): Promise<string> {
  const stored = await getSetting(FLY_PROMPT_KEY);
  return stored?.trim() ? stored : DEFAULT_FLY_PROMPT;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fires after a save so the screen picks up the new prompt. */
  onSaved: (prompt: string) => void;
}

// Editor for the engine prompt that leads every copied day.
//
// This app has no Settings screen — the theme toggle lives in ScreenHeader —
// so the prompt is edited from Fly, which is the only place it means anything.
export default function FlyPromptSheet({ visible, onClose, onSaved }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState(DEFAULT_FLY_PROMPT);
  const [saving, setSaving] = useState(false);

  // Re-read on open rather than holding a draft from a previous visit.
  useEffect(() => {
    if (visible) void loadFlyPrompt().then(setDraft);
  }, [visible]);

  const save = async () => {
    const text = draft.trim() || DEFAULT_FLY_PROMPT;
    setSaving(true);
    try {
      await setSetting(FLY_PROMPT_KEY, text);
      onSaved(text);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back to Fly">
            <Text style={styles.back}>‹ Fly</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Engine prompt</Text>
          <TouchableOpacity
            onPress={() => setDraft(DEFAULT_FLY_PROMPT)}
            accessibilityLabel="Reset to the default prompt"
          >
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <Text style={styles.hint}>
            This leads every copied day, above the timestamped entries. Keep the last
            instruction — without it a model will invent events to make the story flow.
          </Text>
          <TextInput
            style={styles.editor}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            placeholder={DEFAULT_FLY_PROMPT}
            placeholderTextColor={colors.textFaint}
            editable={!saving}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => void save()}
            disabled={saving}
            accessibilityLabel="Save the prompt"
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
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
    reset: { fontFamily: fonts.body, color: colors.accent, fontSize: 15, fontWeight: '700' },
    hint: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    editor: {
      flex: 1,
      margin: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    saveBtn: {
      margin: spacing.md,
      marginTop: 0,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.accent,
    },
    saveText: { fontFamily: fonts.body, color: colors.bg, fontWeight: '700', fontSize: 15 },
  });
