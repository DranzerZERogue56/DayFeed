import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Note } from '../db/types';
import { useNotes } from '../hooks/NotesContext';
import { transcribeAudio, TranscriptionBusyError } from '../lib/transcription';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  note: Note;
  /** Retained for call sites; all surfaces are now light so styling is shared. */
  tone?: 'own' | 'paper' | 'list';
}

interface ControlProps {
  audioUri: string | null;
  transcript: string | null;
  /** Persist the finished transcript. The caller decides which table it lands in. */
  onTranscribed: (text: string) => Promise<void>;
}

const COLLAPSE_CHARS = 140;

// Per-voice-note transcription control — a bronze accent moment. Shows a
// "Transcribe" button until a transcript exists, then renders the transcript
// (collapsible if long). Disabled while a job runs; one job runs app-wide at a
// time, across both the notes and flop_notes tables.
//
// Storage-agnostic: `onTranscribed` decides where the text is saved, so stream
// notes and Flop notes share this control.
export function TranscribeControl({ audioUri, transcript, onTranscribed }: ControlProps) {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  // Already transcribed -> show the text, never the button.
  if (transcript) {
    const long = transcript.length > COLLAPSE_CHARS;
    const shown = long && !expanded ? transcript.slice(0, COLLAPSE_CHARS) + '…' : transcript;
    return (
      <View style={styles.transcriptWrap}>
        <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
        <Text style={styles.transcriptText}>{shown}</Text>
        {long && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
            <Text style={styles.moreLink}>{expanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!audioUri) return null;

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const text = await transcribeAudio(audioUri);
      if (text) {
        await onTranscribed(text);
      } else {
        Alert.alert('No speech detected', 'The transcription came back empty.');
      }
    } catch (err) {
      if (err instanceof TranscriptionBusyError) {
        Alert.alert('Please wait', 'Another transcription is still running.');
      } else {
        Alert.alert(
          'Transcription failed',
          err instanceof Error ? err.message : 'Could not transcribe this note.',
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
      accessibilityLabel="Transcribe voice note"
    >
      {running ? (
        <>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.buttonText}>Transcribing…</Text>
        </>
      ) : (
        <Text style={styles.buttonText}>✎ Transcribe</Text>
      )}
    </TouchableOpacity>
  );
}

// Stream-note binding: saves to `notes` and runs date detection over the fresh
// transcript (Phase 4). Flop notes use TranscribeControl directly — Flop is
// timeless by design and must never feed the agenda.
export default function TranscribeButton({ note }: Props) {
  const { saveTranscript } = useNotes();
  return (
    <TranscribeControl
      audioUri={note.audio_uri}
      transcript={note.transcript}
      onTranscribed={(text) => saveTranscript(note, text)}
    />
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
  transcriptWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  transcriptLabel: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 3,
  },
  transcriptText: {
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
