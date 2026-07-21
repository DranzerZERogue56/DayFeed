import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { useFlop } from '../hooks/FlopContext';
import { useRecorder, type RecorderResult } from '../hooks/useRecorder';
import { persistRecording } from '../utils/audioFiles';
import { CHILD_RELATIONS, type FlopChildRelation } from '../db/flopTypes';
import { formatDuration } from '../utils/date';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme'; // relationStyle now via useTheme()
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { MicIcon } from './Icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Null composes a new root Flop note (no relation picker — roots are 'root'). */
  parentId: string | null;
}

// Add-child composer. Choosing the relation is a deliberate act, made first and
// before writing, so the picker sits at the top and saving is blocked until one
// is chosen. Children can be text or voice (hold the mic, same as the Feed).
export default function FlopComposer({ visible, onClose, parentId }: Props) {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { addFlopNote } = useFlop();
  const [relation, setRelation] = useState<FlopChildRelation | null>(null);
  const [text, setText] = useState('');
  const recorder = useRecorder();

  const isRoot = parentId === null;
  const trimmed = text.trim();
  // Root notes need no relation; children must have one picked before saving.
  const canSave = trimmed.length > 0 && (isRoot || relation !== null);

  const reset = () => {
    setRelation(null);
    setText('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const saveText = async () => {
    if (!canSave) return;
    await addFlopNote({
      parent_id: parentId,
      relation: isRoot ? 'root' : relation!,
      type: 'text',
      content: trimmed,
    });
    close();
  };

  const saveVoice = async (result: RecorderResult) => {
    const id = randomUUID();
    const uri = await persistRecording(result.uri, id);
    await addFlopNote({
      parent_id: parentId,
      relation: isRoot ? 'root' : relation!,
      type: 'voice',
      audio_uri: uri,
      duration_ms: result.durationMs,
    });
    close();
  };

  const onMicPressIn = async () => {
    if (!isRoot && relation === null) {
      Alert.alert('Pick a relation first', 'Choose Support, Idea, or Oppose before recording.');
      return;
    }
    const result = await recorder.start();
    // Only a real 'permission' denial should tell the user to visit
    // Settings — a 'busy' result means a session was already active and
    // isn't a permission problem (see useRecorder.start's StartResult docs).
    if (!result.ok && result.reason === 'permission') {
      Alert.alert(
        'Microphone needed',
        'DayFeed needs microphone access to record voice notes. Enable it in Settings to use voice capture.',
      );
    }
  };

  const onMicPressOut = async () => {
    if (!recorder.isRecording) return;
    const result = await recorder.stop();
    // Ignore ultra-short taps (<500ms) — likely an accidental press.
    if (result && result.durationMs >= 500) {
      await saveVoice(result);
    } else if (result) {
      await recorder.cancel().catch(() => {});
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent={false}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={close} accessibilityLabel="Cancel">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isRoot ? 'New Flop note' : 'Add child'}</Text>
          <TouchableOpacity onPress={saveText} disabled={!canSave} accessibilityLabel="Save note">
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* 'padding' on BOTH platforms — Android edge-to-edge doesn't resize
            the window, so the mic row/input would hide behind the keyboard. */}
        <KeyboardAvoidingView style={styles.body} behavior="padding">
          {!isRoot && (
            <View style={styles.picker}>
              {CHILD_RELATIONS.map((r) => {
                const s = relationStyle[r];
                const active = relation === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.pick,
                      { borderColor: active ? s.color : colors.divider },
                      active && { backgroundColor: s.tint },
                    ]}
                    onPress={() => setRelation(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={s.label}
                  >
                    <Text style={[styles.pickIcon, { color: active ? s.color : colors.textFaint }]}>
                      {s.icon}
                    </Text>
                    <Text style={[styles.pickLabel, { color: active ? s.color : colors.textDim }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={isRoot ? 'Title on the first line, then write…' : 'Write this child…'}
            placeholderTextColor={colors.textFaint}
            multiline
            autoFocus={isRoot}
            textAlignVertical="top"
          />

          <Text style={styles.hint}>The first line becomes the title.</Text>

          <View style={styles.voiceRow}>
            {recorder.isRecording ? (
              <>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{formatDuration(recorder.elapsedMs)}</Text>
                <Text style={styles.recHint}>Release to save</Text>
              </>
            ) : (
              <Text style={styles.voiceHint}>…or hold the mic to record a voice note</Text>
            )}
            <TouchableOpacity
              style={[styles.mic, recorder.isRecording && styles.micActive]}
              onPressIn={onMicPressIn}
              onPressOut={onMicPressOut}
              accessibilityLabel="Hold to record a voice note"
            >
              {recorder.isRecording ? (
                <Text style={styles.micGlyph}>●</Text>
              ) : (
                <MicIcon color={colors.textDim} size={20} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
  cancel: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
  save: { fontFamily: fonts.body, color: colors.accent, fontSize: 15, fontWeight: '700' },
  saveDisabled: { color: colors.textFaint },
  body: { flex: 1, padding: spacing.lg },
  picker: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pick: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  pickIcon: { fontSize: 20, marginBottom: 2 },
  pickLabel: { fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 25,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.mono,
    color: colors.textFaint,
    fontSize: 11,
    marginTop: spacing.sm,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  voiceHint: { flex: 1, fontFamily: fonts.body, color: colors.textFaint, fontSize: 13 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recTime: { fontFamily: fonts.mono, color: colors.text, fontSize: 16 },
  recHint: { flex: 1, fontFamily: fonts.body, color: colors.textDim, fontSize: 13 },
  mic: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.danger },
  micGlyph: { fontSize: 20 },
});
