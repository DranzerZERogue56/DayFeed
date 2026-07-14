import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Note } from '../db/types';
import { useNotes } from '../hooks/NotesContext';
import { transcribeAudio, TranscriptionBusyError } from '../lib/transcription';
import { colors, radius, spacing } from '../theme';

interface Props {
  note: Note;
  /** 'own' = inside the blue Feed bubble; 'paper' = notebook page; 'list' = View All. */
  tone?: 'own' | 'paper' | 'list';
}

const COLLAPSE_CHARS = 140;

// Per-voice-note transcription control. Shows a "Transcribe" button until a
// transcript exists, then renders the transcript (collapsible if long). The
// button is disabled while a job runs, and only one job runs app-wide at a time.
export default function TranscribeButton({ note, tone = 'own' }: Props) {
  const { saveTranscript } = useNotes();
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const onPaper = tone === 'paper';
  const textColor = onPaper ? colors.pageText : tone === 'own' ? '#fff' : colors.text;
  const dimColor = onPaper ? colors.pageDim : colors.textDim;

  // Already transcribed -> show the text, never the button.
  if (note.transcript) {
    const long = note.transcript.length > COLLAPSE_CHARS;
    const shown = long && !expanded ? note.transcript.slice(0, COLLAPSE_CHARS) + '…' : note.transcript;
    return (
      <View style={styles.transcriptWrap}>
        <Text style={[styles.transcriptLabel, { color: dimColor }]}>TRANSCRIPT</Text>
        <Text style={[styles.transcriptText, { color: textColor }]}>{shown}</Text>
        {long && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
            <Text style={[styles.moreLink, { color: dimColor }]}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
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
      style={[styles.button, onPaper && styles.buttonPaper]}
      onPress={run}
      disabled={running}
      accessibilityLabel="Transcribe voice note"
    >
      {running ? (
        <>
          <ActivityIndicator size="small" color={onPaper ? colors.pageText : '#fff'} />
          <Text style={[styles.buttonText, { color: textColor }]}>Transcribing…</Text>
        </>
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>✎ Transcribe</Text>
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
  },
  buttonPaper: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  transcriptWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  moreLink: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
