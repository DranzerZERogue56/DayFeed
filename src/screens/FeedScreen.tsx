import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CaptureBar from '../components/CaptureBar';
import DaySeparator from '../components/DaySeparator';
import NoteBubble from '../components/NoteBubble';
import CaptureCameraScreen from './CaptureCameraScreen';
import { useNotes } from '../hooks/NotesContext';
import { useAllNotes } from '../hooks/useQueries';
import type { RecorderResult } from '../hooks/useRecorder';
import { persistRecording } from '../utils/audioFiles';
import { persistImages } from '../utils/mediaFiles';
import { randomUUID } from 'expo-crypto';
import type { Note } from '../db/types';
import { colors, spacing } from '../theme';
import { Alert } from 'react-native';

type Row =
  | { kind: 'sep'; id: string; dayKey: string }
  | { kind: 'note'; id: string; note: Note };

// Feed: chat-style quick capture. Inverted list keeps the newest note pinned to
// the bottom, just above the capture bar.
export default function FeedScreen() {
  const { notes } = useAllNotes({});
  const { addNote, removeNote } = useNotes();
  const [cameraOpen, setCameraOpen] = useState(false);

  const rows = useMemo<Row[]>(() => {
    // notes arrive newest-first; walk chronologically to insert day headers.
    const chrono = [...notes].reverse();
    const out: Row[] = [];
    let lastDay: string | null = null;
    for (const n of chrono) {
      if (n.day_key !== lastDay) {
        out.push({ kind: 'sep', id: `sep-${n.day_key}`, dayKey: n.day_key });
        lastDay = n.day_key;
      }
      out.push({ kind: 'note', id: n.id, note: n });
    }
    // Reverse for the inverted FlatList (index 0 renders at the bottom).
    return out.reverse();
  }, [notes]);

  const onSendText = (text: string) => {
    void addNote({ type: 'text', content: text });
  };

  const onRecorded = async (result: RecorderResult) => {
    const id = randomUUID();
    const uri = await persistRecording(result.uri, id);
    await addNote({ type: 'voice', audio_uri: uri, duration_ms: result.durationMs });
  };

  const onPermissionDenied = () => {
    Alert.alert(
      'Microphone needed',
      'DayFeed needs microphone access to record voice notes. Enable it in Settings to use voice capture.',
    );
  };

  // One capture session -> one photo note. Copy every image into app storage.
  const onCameraComplete = async (sourceUris: string[]) => {
    setCameraOpen(false);
    if (sourceUris.length === 0) return;
    const stored = await persistImages(sourceUris);
    if (stored.length === 0) {
      Alert.alert('Could not save photos', 'None of the images could be saved.');
      return;
    }
    await addNote({ type: 'photo', media_uris: stored });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>DayFeed</Text>
        <Text style={styles.subtitle}>Quick capture</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>📝</Text>
            <Text style={styles.emptyTitle}>Nothing captured yet</Text>
            <Text style={styles.emptyBody}>
              Type below and hit send, or hold the mic to record a voice note.
            </Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            inverted
            keyExtractor={(r) => r.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) =>
              item.kind === 'sep' ? (
                <DaySeparator dayKey={item.dayKey} />
              ) : (
                <NoteBubble note={item.note} onDelete={(n) => removeNote(n.id)} />
              )
            }
          />
        )}
        <CaptureBar
          onSendText={onSendText}
          onRecorded={onRecorded}
          onPermissionDenied={onPermissionDenied}
          onOpenCamera={() => setCameraOpen(true)}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => setCameraOpen(false)}
      >
        <CaptureCameraScreen
          onComplete={onCameraComplete}
          onClose={() => setCameraOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  listContent: { paddingVertical: spacing.md },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyGlyph: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyBody: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
