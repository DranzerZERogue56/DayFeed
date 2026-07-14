import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Note } from '../db/types';
import { useNotes } from '../hooks/NotesContext';
import { transcribeAudio, TranscriptionBusyError } from '../lib/transcription';
import { colors, fonts, radius, spacing, type } from '../theme';

interface Props {
  note: Note;
  /** Retained for call sites; all surfaces are now light so styling is shared. */
  tone?: 'own' | 'paper' | 'list';
}

const COLLAPSE_CHARS = 140;

// Per-voice-note transcription control — a bronze accent moment. Shows a
// "Transcribe" button until a transcript exists, then renders the transcript
// (collapsible if long). Disabled while a job runs; one job runs app-wide at a time.
export default function TranscribeButton({ note }: Props) {
  const { saveTranscript } = useNotes();
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Already transcribed -> show the text, never the button.
  if (note.transcript) {
    const long = note.transcript.length > COLLAPSE_CHARS;
    const shown = long && !expanded ? note.transcript.slice(0, COLLAPSE_CHARS) + '…' : note.transcript;
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

  if (!note.audio_uri) return null;

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const text = await transcribeAudio(note.audio_uri!);
      if (text) {
        // Persists the transcript and runs date detection over it (Phase 4).
        await saveTranscript(note, text);
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

const styles = StyleSheet.create({
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
