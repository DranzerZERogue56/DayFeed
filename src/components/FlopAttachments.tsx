import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {
  addFlopAttachment,
  deleteFlopAttachment,
  setFlopAttachmentText,
  type FlopAttachment,
} from '../db/flopAttachments';
import { extractDocumentText } from '../lib/documentText';
import { deleteDocumentFiles, persistDocument } from '../utils/attachmentFiles';
import MarkdownText from './MarkdownText';
import NoteActionsSheet from './NoteActionsSheet';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  flopId: string;
  attachments: FlopAttachment[];
  /** Re-query after a change. */
  onChanged: () => void;
}

const COLLAPSE_CHARS = 240;

/** Bytes as something readable next to a filename. */
export function formatSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Documents imported onto a Flop note: the file is kept and reopenable, and
// where the format allowed it, its text shows underneath as note context.
// PDFs attach without text — see lib/documentText for why.
export default function FlopAttachments({ flopId, attachments, onChanged }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<FlopAttachment | null>(null);

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    setBusy(true);
    try {
      const uri = await persistDocument(asset.uri, asset.name);
      // Insert first, extract after: a slow or failed extraction should never
      // cost the user the attachment itself.
      const row = await addFlopAttachment(flopId, {
        name: asset.name,
        uri,
        mime: asset.mimeType ?? null,
        size: asset.size ?? null,
      });
      onChanged();

      const text = await extractDocumentText(uri, asset.name);
      if (text) {
        await setFlopAttachmentText(row.id, text);
        onChanged();
      }
    } catch {
      Alert.alert('Could not add file', 'That document could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  const open = async (a: FlopAttachment) => {
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(a.uri);
    } catch {
      Alert.alert('Could not open', `No app on this device can open ${a.name}.`);
    }
  };

  const remove = async (a: FlopAttachment) => {
    await deleteFlopAttachment(a.id);
    await deleteDocumentFiles([a.uri]);
    setConfirming(null);
    onChanged();
  };

  const copy = async (a: FlopAttachment) => {
    if (!a.extracted_text) return;
    await Clipboard.setStringAsync(a.extracted_text);
    setCopied(a.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>FILES</Text>
        <TouchableOpacity onPress={pick} disabled={busy} accessibilityLabel="Add a file">
          {busy ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.addLink}>+ Add file</Text>
          )}
        </TouchableOpacity>
      </View>

      {attachments.map((a) => {
        const text = a.extracted_text;
        const long = !!text && text.length > COLLAPSE_CHARS;
        const isOpen = expanded === a.id;
        const shown = text && long && !isOpen ? text.slice(0, COLLAPSE_CHARS) + '…' : text;

        return (
          <View key={a.id} style={styles.row}>
            <View style={styles.fileLine}>
              <TouchableOpacity style={styles.fileName} onPress={() => open(a)}>
                <Text style={styles.name} numberOfLines={1}>
                  {a.name}
                </Text>
                {!!formatSize(a.size) && <Text style={styles.size}>{formatSize(a.size)}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setConfirming(a)}
                accessibilityLabel={`Remove ${a.name}`}
              >
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!shown && (
              <View style={styles.textWrap}>
                <View style={styles.textHead}>
                  <Text style={styles.textLabel}>TEXT</Text>
                  <TouchableOpacity onPress={() => copy(a)}>
                    <Text style={styles.link}>{copied === a.id ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
                <MarkdownText content={shown} textStyle={styles.text} />
                {long && (
                  <TouchableOpacity onPress={() => setExpanded(isOpen ? null : a.id)}>
                    <Text style={styles.link}>{isOpen ? 'Show less' : 'Show more'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      <NoteActionsSheet
        visible={confirming !== null}
        subtitle={`“${confirming?.name ?? ''}” will be removed from this note.`}
        actions={[
          {
            label: 'Remove',
            danger: true,
            onPress: () => confirming && void remove(confirming),
          },
        ]}
        onClose={() => setConfirming(null)}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      marginTop: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    label: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
    },
    addLink: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    row: { marginTop: spacing.sm },
    fileLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      backgroundColor: colors.accentTint,
    },
    fileName: { flexShrink: 1, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: {
      flexShrink: 1,
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.timestamp,
    },
    size: {
      fontFamily: fonts.mono,
      color: colors.textFaint,
      fontSize: 11,
    },
    remove: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 16,
      paddingHorizontal: spacing.xs,
    },
    textWrap: {
      marginTop: spacing.xs,
      paddingLeft: spacing.md,
    },
    textHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    textLabel: {
      fontFamily: fonts.mono,
      color: colors.textFaint,
      fontSize: 10,
      letterSpacing: 1,
    },
    text: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: type.caption + 1,
      lineHeight: 19,
    },
    link: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
  });
