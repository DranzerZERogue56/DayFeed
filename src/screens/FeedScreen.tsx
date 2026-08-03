import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import CaptureBar from '../components/CaptureBar';
import DaySeparator from '../components/DaySeparator';
import NoteBubble from '../components/NoteBubble';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import CaptureCameraScreen from './CaptureCameraScreen';
import PhotosScreen from './PhotosScreen';
import { ImagesIcon } from '../components/Icons';
import { useNotes } from '../hooks/NotesContext';
import { useFlop } from '../hooks/FlopContext';
import { flopTitle } from '../db/flopTypes';
import { useAllNotes } from '../hooks/useQueries';
import { getClaudeTaggedNotes } from '../db/notes';
import { CLAUDE_TAG } from '../lib/claudeTag';
import { exportClaudeNotes } from '../lib/claudeExportFile';
import type { RecorderResult } from '../hooks/useRecorder';
import type { RootTabParamList } from '../navigation/types';
import { persistRecording } from '../utils/audioFiles';
import { persistImages } from '../utils/mediaFiles';
import { randomUUID } from 'expo-crypto';
import type { Note } from '../db/types';
import { fonts, radius, spacing, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { Alert } from 'react-native';
import NoteActionsSheet from '../components/NoteActionsSheet';

type Row =
  | { kind: 'sep'; id: string; dayKey: string }
  | { kind: 'note'; id: string; note: Note };

// Feed: chat-style quick capture. Inverted list keeps the newest note pinned to
// the bottom, just above the capture bar.
export default function FeedScreen() {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { notes } = useAllNotes({});
  const { addNote, removeNote } = useNotes();
  const { promoteNote } = useFlop();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [sentTitle, setSentTitle] = useState<string | null>(null);
  // Sticky across sends: a run of context notes only needs arming once.
  const [taggingForClaude, setTaggingForClaude] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  // Tapping a day separator carries you into that day in the Flip notebook.
  const openDayInFlip = (dayKey: string) => {
    navigation.navigate('Flip', { jumpTo: dayKey, ts: Date.now() });
  };

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

  /** Tags to stamp on whatever is captured next, per the capture bar's star. */
  const captureTags = () => (taggingForClaude ? [CLAUDE_TAG] : undefined);

  const onSendText = (text: string) => {
    void addNote({ type: 'text', content: text, tags: captureTags() });
  };

  const onRecorded = async (result: RecorderResult) => {
    const id = randomUUID();
    const uri = await persistRecording(result.uri, id);
    await addNote({
      type: 'voice',
      audio_uri: uri,
      duration_ms: result.durationMs,
      tags: captureTags(),
    });
  };

  // Tagged notes leave the app as one markdown file, which the share sheet can
  // drop into Downloads for scripts/pull-claude-notes.sh to collect.
  const exportForClaude = async () => {
    try {
      const tagged = await getClaudeTaggedNotes();
      if (tagged.length === 0) {
        setExportNotice('No notes are tagged yet. Arm the ★ in the capture bar first.');
        return;
      }
      await exportClaudeNotes(tagged);
    } catch {
      setExportNotice('That export could not be created.');
    }
  };

  const onSendToFlop = async (note: Note) => {
    const flop = await promoteNote(note);
    if (!flop) return;
    setSentTitle(flopTitle(flop));
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
      <ScreenHeader
        overline="Quick capture"
        title="DayFeed"
        action={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.photosBtn}
              onPress={() => void exportForClaude()}
              accessibilityLabel="Export notes tagged for Claude"
            >
              <Text style={styles.photosBtnText}>★ Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photosBtn}
              onPress={() => setPhotosOpen(true)}
              accessibilityLabel="View photo notes"
            >
              <ImagesIcon color={colors.accent} size={18} />
              <Text style={styles.photosBtnText}>Photos</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {/* 'padding' on BOTH platforms: Android edge-to-edge (SDK 52+) no longer
          resizes the window for the keyboard, so without this the capture bar
          sits hidden behind the keyboard while typing. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing captured yet."
            hint="Type below and hit send, or hold the mic to record a voice note."
          />
        ) : (
          <FlatList
            data={rows}
            inverted
            keyExtractor={(r) => r.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) =>
              item.kind === 'sep' ? (
                <DaySeparator dayKey={item.dayKey} onPress={openDayInFlip} />
              ) : (
                <NoteBubble
                  note={item.note}
                  onDelete={(n) => removeNote(n.id)}
                  onSendToFlop={onSendToFlop}
                />
              )
            }
          />
        )}
        <CaptureBar
          onSendText={onSendText}
          onRecorded={onRecorded}
          onPermissionDenied={onPermissionDenied}
          onOpenCamera={() => setCameraOpen(true)}
          taggingForClaude={taggingForClaude}
          onToggleTagging={() => setTaggingForClaude((on) => !on)}
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

      <PhotosScreen visible={photosOpen} onClose={() => setPhotosOpen(false)} />

      <NoteActionsSheet
        visible={sentTitle !== null}
        subtitle={`“${sentTitle ?? ''}” is now a Flop root note.`}
        actions={[
          {
            label: 'Open Flop',
            onPress: () => {
              setSentTitle(null);
              navigation.navigate('Flop');
            },
          },
        ]}
        onClose={() => setSentTitle(null)}
      />

      <NoteActionsSheet
        visible={exportNotice !== null}
        subtitle={exportNotice ?? ''}
        actions={[]}
        onClose={() => setExportNotice(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  listContent: { paddingVertical: spacing.sm },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
  },
  photosBtnText: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
