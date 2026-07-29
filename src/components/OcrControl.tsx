import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { isOcrBusy, OcrBusyError, recognizeText } from '../lib/ocr';
import { toggleCheckboxLine } from '../lib/markdownList';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import MarkdownText from './MarkdownText';

interface Props {
  mediaUris: string[];
  ocrText: string | null;
  /** Persist the extracted text. The caller decides which note it lands on. */
  onExtracted: (text: string) => Promise<void>;
}

const COLLAPSE_CHARS = 140;

// Per-photo-note OCR control — same shape as TranscribeControl: an "Extract
// text" button until text exists, then the extracted text (collapsible if
// long). One job runs at a time, independent of transcription's busy-flag.
export default function OcrControl({ mediaUris, ocrText, onExtracted }: Props) {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  if (ocrText) {
    const long = ocrText.length > COLLAPSE_CHARS;
    const shown = long && !expanded ? ocrText.slice(0, COLLAPSE_CHARS) + '…' : ocrText;
    const copy = async () => {
      await Clipboard.setStringAsync(ocrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    return (
      <View style={styles.textWrap}>
        <View style={styles.textLabelRow}>
          <Text style={styles.textLabel}>EXTRACTED TEXT</Text>
          <TouchableOpacity onPress={copy} accessibilityLabel="Copy extracted text">
            <Text style={styles.copyLink}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <MarkdownText
          content={shown}
          textStyle={styles.text}
          onToggleCheckbox={(lineIndex) => onExtracted(toggleCheckboxLine(ocrText, lineIndex))}
        />
        {long && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
            <Text style={styles.moreLink}>{expanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (mediaUris.length === 0) return null;

  const run = async () => {
    if (running || isOcrBusy()) return;
    setRunning(true);
    try {
      const text = await recognizeText(mediaUris);
      if (text) {
        await onExtracted(text);
      } else {
        Alert.alert('No text found', 'These photos don’t seem to contain any readable text.');
      }
    } catch (err) {
      if (err instanceof OcrBusyError) {
        Alert.alert('Please wait', 'Another text extraction is still running.');
      } else {
        Alert.alert(
          'Text extraction failed',
          err instanceof Error ? err.message : 'Could not read text from these photos.',
        );
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={run}
      disabled={running}
      accessibilityLabel="Extract text from photos"
    >
      {running ? (
        <>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.buttonText}>Extracting…</Text>
        </>
      ) : (
        <Text style={styles.buttonText}>✎ Extract text</Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      alignSelf: 'flex-start',
    },
    buttonText: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    textWrap: {
      marginTop: spacing.sm,
    },
    textLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    textLabel: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
    },
    copyLink: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    text: {
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.timestamp,
      lineHeight: 21,
    },
    moreLink: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
  });
