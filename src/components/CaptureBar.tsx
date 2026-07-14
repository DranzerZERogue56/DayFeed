import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRecorder, type RecorderResult } from '../hooks/useRecorder';
import { formatDuration } from '../utils/date';
import { colors, radius, spacing } from '../theme';

interface Props {
  onSendText: (text: string) => void;
  onRecorded: (result: RecorderResult) => void;
  onPermissionDenied: () => void;
  onOpenCamera: () => void;
}

const CANCEL_THRESHOLD = -90; // px dragged left to cancel a recording

// Sticky bottom bar: text field + send, and a hold-to-record mic. Press and hold
// the mic to record, release to save, slide left to cancel.
export default function CaptureBar({
  onSendText,
  onRecorded,
  onPermissionDenied,
  onOpenCamera,
}: Props) {
  const [text, setText] = useState('');
  const recorder = useRecorder();
  const [willCancel, setWillCancel] = useState(false);

  // Refs so the PanResponder (created once) sees live state.
  const cancelRef = useRef(false);
  const startedRef = useRef(false);
  const slideX = useRef(new Animated.Value(0)).current;

  const trimmed = text.trim();
  const canSend = trimmed.length > 0;

  const send = () => {
    if (!canSend) return;
    onSendText(trimmed);
    setText('');
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: async () => {
          cancelRef.current = false;
          startedRef.current = false;
          setWillCancel(false);
          slideX.setValue(0);
          const ok = await recorder.start();
          startedRef.current = ok;
          if (!ok) {
            onPermissionDenied();
          }
        },
        onPanResponderMove: (_evt, gesture) => {
          if (!startedRef.current) return;
          const dx = Math.min(0, gesture.dx);
          slideX.setValue(dx);
          const shouldCancel = dx < CANCEL_THRESHOLD;
          if (shouldCancel !== cancelRef.current) {
            cancelRef.current = shouldCancel;
            setWillCancel(shouldCancel);
          }
        },
        onPanResponderRelease: async () => {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
          if (!startedRef.current) return;
          if (cancelRef.current) {
            await recorder.cancel();
          } else {
            const result = await recorder.stop();
            // Ignore ultra-short taps (<500ms) — likely an accidental press.
            if (result && result.durationMs >= 500) {
              onRecorded(result);
            } else if (result) {
              // discard the tiny file
              await recorder.cancel().catch(() => {});
            }
          }
          setWillCancel(false);
        },
        onPanResponderTerminate: async () => {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
          if (startedRef.current) await recorder.cancel();
          setWillCancel(false);
        },
      }),
    // recorder methods are stable (useCallback); safe to build once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (recorder.isRecording) {
    return (
      <View style={styles.bar}>
        <Animated.View
          style={[styles.recording, { transform: [{ translateX: slideX }] }]}
        >
          <View style={styles.recDot} />
          <Text style={styles.recTime}>{formatDuration(recorder.elapsedMs)}</Text>
          <Text style={[styles.recHint, willCancel && styles.recHintActive]}>
            {willCancel ? 'Release to cancel' : '‹ Slide to cancel'}
          </Text>
        </Animated.View>
        <View
          style={[styles.mic, styles.micActive, willCancel && styles.micCancel]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.micGlyph}>{willCancel ? '✕' : '●'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.camera}
        onPress={onOpenCamera}
        accessibilityLabel="Take a photo note"
      >
        <Text style={styles.cameraGlyph}>📷</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Write a note…"
        placeholderTextColor={colors.textFaint}
        multiline
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={send}
      />
      {canSend ? (
        <TouchableOpacity style={styles.send} onPress={send} accessibilityLabel="Send note">
          <Text style={styles.sendGlyph}>↑</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.mic} {...panResponder.panHandlers}>
          <Text style={styles.micGlyph}>🎤</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  camera: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cameraGlyph: { fontSize: 20 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontSize: 16,
    marginRight: spacing.sm,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.bubbleOwn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: {
    backgroundColor: colors.voiceAccent,
  },
  micCancel: {
    backgroundColor: colors.danger,
  },
  micGlyph: {
    fontSize: 20,
  },
  recording: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginRight: spacing.sm,
    paddingLeft: spacing.sm,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    marginRight: spacing.sm,
  },
  recTime: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    marginRight: spacing.md,
  },
  recHint: {
    color: colors.textDim,
    fontSize: 13,
    flex: 1,
  },
  recHintActive: {
    color: colors.danger,
    fontWeight: '700',
  },
});
