import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { applyMarkdownEdit, useMarkdownCursorRef } from '../hooks/useMarkdownInput';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

interface Props {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

// In-place editor for a text note's body, opened from the long-press menu.
// Mirrors the transcript editor in TranscribeControl: same markdown
// auto-continue while typing, same Cancel/Save row, same no-op on an empty or
// unchanged draft.
export default function NoteContentEditor({ initialContent, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const { inputRef: editorRef, moveCursor } = useMarkdownCursorRef();
  const styles = useStyles(makeStyles);

  const onChangeDraft = (next: string) => {
    const result = applyMarkdownEdit(draft, next);
    if (result) {
      setDraft(result.text);
      moveCursor(result.cursor);
    } else {
      setDraft(next);
    }
  };

  const save = async () => {
    const text = draft.trim();
    if (!text || text === initialContent) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(text);
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <TextInput
        ref={editorRef}
        style={styles.editor}
        value={draft}
        onChangeText={onChangeDraft}
        multiline
        autoFocus
        textAlignVertical="top"
        editable={!saving}
      />
      <View style={styles.actions}>
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={styles.link}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving}>
          <Text style={styles.link}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    editor: {
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.noteBody,
      lineHeight: 26,
      minHeight: 60,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      borderRadius: radius.sm,
      padding: spacing.sm,
      backgroundColor: colors.accentTint,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.lg,
      marginTop: spacing.xs,
    },
    link: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
  });
