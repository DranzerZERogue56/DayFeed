import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Note } from '../db/types';
import { useNotes } from '../hooks/NotesContext';
import { applyMarkdownEdit, useMarkdownCursorRef } from '../hooks/useMarkdownInput';
import { transcribeAudio, TranscriptionBusyError } from '../lib/transcription';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { VoicePlayerContext } from './VoiceNoteBody';
import VoicePlayerRow from './VoicePlayerRow';

interface Props {
  note: Note;
  /** Right-aligned content for the audio row — see ControlProps.trailing. */
  trailing?: React.ReactNode;
}

interface ControlProps {
  audioUri: string | null;
  transcript: string | null;
  /** Persist the finished transcript. The caller decides which table it lands in. */
  onTranscribed: (text: string) => Promise<void>;
  /**
   * Optional right-aligned content for the audio row. The Feed passes its
   * timestamp here so the time shares that row instead of needing one of its
   * own; the surfaces that print a timestamp elsewhere pass nothing.
   */
  trailing?: React.ReactNode;
}

const COLLAPSE_CHARS = 140;

// Per-voice-note transcription control. Shows a "Transcribe" button until a
// transcript exists, then the transcript itself (collapsible if long) above a
// thin row carrying the player and the edit action. Disabled while a job runs;
// one job runs app-wide at a time, across both the notes and flop_notes tables.
//
// The transcript leads because it is the content — the audio reads as a
// footnote under it, which keeps a voice note close in height to a text one.
//
// Storage-agnostic: `onTranscribed` decides where the text is saved, so stream
// notes and Flop notes share this control.
export function TranscribeControl({
  audioUri,
  transcript,
  onTranscribed,
  trailing,
}: ControlProps) {
  const voice = useContext(VoicePlayerContext);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // non-null = editing
  const [saving, setSaving] = useState(false);
  const { inputRef: editorRef, moveCursor } = useMarkdownCursorRef();
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  const onChangeDraft = (next: string) => {
    if (draft === null) return;
    const result = applyMarkdownEdit(draft, next);
    if (result) {
      setDraft(result.text);
      moveCursor(result.cursor);
    } else {
      setDraft(next);
    }
  };

  // Already transcribed -> show the text (or its editor), never the button.
  if (transcript) {
    if (draft !== null) {
      const saveEdit = async () => {
        const text = draft.trim();
        if (!text || text === transcript) {
          setDraft(null);
          return;
        }
        setSaving(true);
        try {
          await onTranscribed(text);
          setDraft(null);
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
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setDraft(null)} disabled={saving}>
              <Text style={styles.moreLink}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveEdit} disabled={saving}>
              <Text style={[styles.moreLink, styles.saveLink]}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          {/* No edit glyph here — you are already editing. The row stays so
              the caller's timestamp doesn't vanish mid-edit. */}
          <View style={styles.audioRow}>
            {voice && <VoicePlayerRow note={voice.note} />}
            <View style={styles.audioSpacer} />
            {trailing}
          </View>
        </View>
      );
    }

    const long = transcript.length > COLLAPSE_CHARS;
    const shown = long && !expanded ? transcript.slice(0, COLLAPSE_CHARS) + '…' : transcript;
    return (
      <View>
        <Text style={styles.transcriptText}>{shown}</Text>
        {long && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
            <Text style={styles.moreLink}>{expanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.audioRow}>
          {voice && <VoicePlayerRow note={voice.note} />}
          <TouchableOpacity
            onPress={() => setDraft(transcript)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Edit transcript"
          >
            <Text style={styles.editGlyph}>✎</Text>
          </TouchableOpacity>
          <View style={styles.audioSpacer} />
          {trailing}
        </View>
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

  // Nothing transcribed yet: the player and the Transcribe action share the
  // same row the audio footnote will occupy once a transcript exists.
  return (
    <View style={styles.audioRow}>
      {voice && <VoicePlayerRow note={voice.note} />}
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
      <View style={styles.audioSpacer} />
      {trailing}
    </View>
  );
}

// Stream-note binding: saves to `notes` and runs date detection over the fresh
// transcript (Phase 4). Flop notes use TranscribeControl directly — Flop is
// timeless by design and must never feed the agenda.
export default function TranscribeButton({ note, trailing }: Props) {
  const { saveTranscript } = useNotes();
  return (
    <TranscribeControl
      audioUri={note.audio_uri}
      transcript={note.transcript}
      trailing={trailing}
      onTranscribed={(text) => saveTranscript(note, text)}
    />
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  // Keeps its pill: this is the primary action on a note with no transcript
  // yet, not an icon affordance like the edit glyph.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
  },
  buttonText: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  // The audio footnote: player, edit glyph, then whatever the caller wants
  // right-aligned (the Feed puts its timestamp here).
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  audioSpacer: {
    flex: 1,
  },
  // A bare glyph rather than a pill — it sits beside the play control, and two
  // competing bordered shapes on one small row read as noise.
  editGlyph: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
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
  editor: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: type.timestamp,
    lineHeight: 21,
    minHeight: 60,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.accentTint,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  saveLink: {
    color: colors.accent,
  },
});
