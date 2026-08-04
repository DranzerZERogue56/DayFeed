import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import EmptyState from '../components/EmptyState';
import NoteActionsSheet from '../components/NoteActionsSheet';
import {
  addNotedUpdate,
  clearNotedUpdates,
  deleteNotedUpdate,
  getNotedUpdates,
  type NotedUpdate,
} from '../db/notedUpdates';
import { notedUpdatesToClipboard } from '../lib/notedUpdates';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Noted-updates: a scratch list for changes to hand to Claude. Written here,
// copied out as a numbered list, then cleared. Kept out of the Feed on purpose
// — these are a to-do for someone else, not a record of the day.
export default function NotedUpdatesScreen({ visible, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [updates, setUpdates] = useState<NotedUpdate[]>([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(async () => {
    setUpdates(await getNotedUpdates());
  }, []);

  // Re-read on open rather than holding stale rows from a previous visit.
  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  const onAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    await addNotedUpdate(text);
    setDraft('');
    await refresh();
  };

  const onDelete = async (id: string) => {
    await deleteNotedUpdate(id);
    await refresh();
  };

  const onCopyAll = async () => {
    if (updates.length === 0) return;
    await Clipboard.setStringAsync(notedUpdatesToClipboard(updates));
    setNotice(
      `Copied ${updates.length} update${updates.length === 1 ? '' : 's'} to the clipboard.`,
    );
  };

  const onClearAll = async () => {
    await clearNotedUpdates();
    setConfirmClear(false);
    await refresh();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back to Feed">
            <Text style={styles.back}>‹ Feed</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Noted-updates</Text>
          <TouchableOpacity
            onPress={() => setConfirmClear(true)}
            disabled={updates.length === 0}
            accessibilityLabel="Clear all updates"
          >
            <Text style={[styles.clear, updates.length === 0 && styles.disabled]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* 'padding' on both platforms, as on Feed: Android edge-to-edge no
            longer resizes the window for the keyboard. */}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {updates.length === 0 ? (
            <EmptyState
              title="No updates noted yet."
              hint="Type a change below. Copy all turns the list into a numbered set to paste into a prompt."
            />
          ) : (
            <FlatList
              data={updates}
              keyExtractor={(u) => u.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <View style={styles.row}>
                  <Text style={styles.marker}>{index + 1}.</Text>
                  <Text style={styles.rowText}>{item.content}</Text>
                  <TouchableOpacity
                    onPress={() => void onDelete(item.id)}
                    hitSlop={8}
                    accessibilityLabel={`Delete update ${index + 1}`}
                  >
                    <Text style={styles.rowDelete}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Note an update…"
              placeholderTextColor={colors.textFaint}
              multiline
            />
            <TouchableOpacity
              style={[styles.addBtn, !draft.trim() && styles.disabledBtn]}
              onPress={() => void onAdd()}
              disabled={!draft.trim()}
              accessibilityLabel="Add update"
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.copyBtn, updates.length === 0 && styles.disabledBtn]}
            onPress={() => void onCopyAll()}
            disabled={updates.length === 0}
            accessibilityLabel="Copy all updates"
          >
            <Text style={styles.copyBtnText}>
              Copy all{updates.length > 0 ? ` (${updates.length})` : ''}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <NoteActionsSheet
        visible={notice !== null}
        subtitle={notice ?? ''}
        actions={[]}
        onClose={() => setNotice(null)}
      />

      <NoteActionsSheet
        visible={confirmClear}
        subtitle="Every noted update will be removed. Copy them first if you still need them."
        actions={[{ label: 'Clear all', danger: true, onPress: () => void onClearAll() }]}
        onClose={() => setConfirmClear(false)}
      />
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
    clear: { fontFamily: fonts.body, color: colors.danger, fontSize: 15, fontWeight: '700' },
    disabled: { color: colors.textFaint },
    listContent: { padding: spacing.md, gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    marker: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: type.noteBody,
      lineHeight: 24,
    },
    // flexShrink rather than flex:1 so the text still reports its own width —
    // same reason as MarkdownText's body style.
    rowText: {
      flexShrink: 1,
      flexGrow: 1,
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.noteBody,
      lineHeight: 24,
    },
    rowDelete: { fontFamily: fonts.body, color: colors.textFaint, fontSize: 20, lineHeight: 24 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    input: {
      flex: 1,
      maxHeight: 140,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.noteBody,
    },
    addBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      backgroundColor: colors.accentTint,
    },
    addBtnText: { fontFamily: fonts.body, color: colors.accent, fontWeight: '700', fontSize: 14 },
    copyBtn: {
      margin: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.accent,
    },
    copyBtnText: { fontFamily: fonts.body, color: colors.bg, fontWeight: '700', fontSize: 15 },
    disabledBtn: { opacity: 0.4 },
  });
