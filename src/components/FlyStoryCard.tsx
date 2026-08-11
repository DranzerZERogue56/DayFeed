import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { FlyStory } from '../db/flyTypes';
import { formatClock } from '../utils/date';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  story: FlyStory;
  /** True when entries have been added since the story was written. */
  stale: boolean;
  onSave: (content: string) => Promise<void>;
  onDelete: () => void;
  /** Lets the screen clear the bars below out of the editor's way. */
  onEditingChange?: (editing: boolean) => void;
}

const COLLAPSE_CHARS = 400;

// The consolidated day, sitting above the entries it was made from.
//
// Serif and full-width — this is the finished thing, and the timestamped
// fragments beneath it are the working. Long stories collapse so the board
// underneath stays reachable without a long scroll.
export default function FlyStoryCard({
  story,
  stale,
  onSave,
  onDelete,
  onEditingChange,
}: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // non-null = editing
  const [saving, setSaving] = useState(false);

  // One place to flip the draft, so the screen is never told the editor is open
  // when it isn't (leaving the capture bar hidden with no way to bring it back).
  const setEditing = (next: string | null) => {
    setDraft(next);
    onEditingChange?.(next !== null);
  };

  if (draft !== null) {
    const save = async () => {
      const text = draft.trim();
      if (!text || text === story.content) {
        setEditing(null);
        return;
      }
      setSaving(true);
      try {
        await onSave(text);
        setEditing(null);
      } finally {
        setSaving(false);
      }
    };
    return (
      <View style={styles.card}>
        <TextInput
          style={styles.editor}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          textAlignVertical="top"
          editable={!saving}
        />
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setEditing(null)} disabled={saving}>
            <Text style={styles.link}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void save()} disabled={saving}>
            <Text style={[styles.link, styles.strong]}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const long = story.content.length > COLLAPSE_CHARS;
  const shown =
    long && !expanded ? story.content.slice(0, COLLAPSE_CHARS).trimEnd() + '…' : story.content;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>THE DAY</Text>
        {/* The story is never regenerated behind your back — an edit you made
            would go with it — so a stale one says so and waits. */}
        {stale && <Text style={styles.stale}>entries added since</Text>}
      </View>

      <Text style={styles.body}>{shown}</Text>

      {long && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
          <Text style={styles.link}>{expanded ? 'Show less' : 'Show more'}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <Text style={styles.stamp}>{formatClock(story.updated_at)}</Text>
        <View style={styles.spacer} />
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Text style={[styles.link, styles.danger]}>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(story.content)} hitSlop={8}>
          <Text style={[styles.link, styles.strong]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    eyebrow: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: type.overline,
      letterSpacing: 2,
    },
    stale: {
      fontFamily: fonts.body,
      color: colors.textFaint,
      fontSize: 11,
      fontStyle: 'italic',
    },
    body: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: 16,
      lineHeight: 26,
    },
    editor: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: 16,
      lineHeight: 26,
      minHeight: 160,
      // Capped, and it scrolls inside itself past this. Without a ceiling the
      // editor grows with the story, and on a long one the Cancel/Save row
      // below it was pushed off the bottom of the scroll area — with autoFocus
      // raising the keyboard immediately, both actions were unreachable the
      // instant you tapped Edit.
      maxHeight: 240,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      borderRadius: radius.sm,
      padding: spacing.sm,
      backgroundColor: colors.accentTint,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.lg,
      marginTop: spacing.sm,
    },
    spacer: { flex: 1 },
    stamp: {
      fontFamily: fonts.mono,
      color: colors.textFaint,
      fontSize: 10,
    },
    link: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '700',
    },
    strong: { color: colors.accent },
    danger: { color: colors.danger },
  });
