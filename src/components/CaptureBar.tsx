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
import { useMarkdownInput } from '../hooks/useMarkdownInput';
import { formatDuration } from '../utils/date';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { fonts, radius, spacing, type ColorPalette } from '../theme';
import { CameraIcon, MicIcon } from './Icons';

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
  const { value: text, onChangeText: setText, inputRef, setValue: setTextValue } =
    useMarkdownInput('');
  const recorder = useRecorder();
  const [willCancel, setWillCancel] = useState(false);
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  // Refs so the PanResponder (created once) sees live state.
  const cancelRef = useRef(false);
  const startedRef = useRef(false);
  const slideX = useRef(new Animated.Value(0)).current;
  // Set when the finger lifts (or the gesture is interrupted) BEFORE
  // recorder.start() has resolved — e.g. the OS permission dialog is still
  // up. Without this, that release is silently dropped (startedRef isn't
  // true yet), the recording then begins a moment later once start()
  // finishes, and it's left running with no gesture left to stop it.
  const pendingEndRef = useRef<null | 'stop' | 'cancel'>(null);

  const resolvePendingEnd = async () => {
    const intent = pendingEndRef.current;
    pendingEndRef.current = null;
    if (!intent) return;
    if (intent === 'cancel') {
      await recorder.cancel();
    } else {
      const result = await recorder.stop();
      if (result && result.durationMs >= 500) {
        onRecorded(result);
      } else if (result) {
        await recorder.cancel().catch(() => {});
      }
    }
    setWillCancel(false);
  };

  const trimmed = text.trim();
  const canSend = trimmed.length > 0;

  const send = () => {
    if (!canSend) return;
    onSendText(trimmed);
    setTextValue('');
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: async () => {
          cancelRef.current = false;
          startedRef.current = false;
          pendingEndRef.current = null;
          setWillCancel(false);
          slideX.setValue(0);
          const result = await recorder.start();
          startedRef.current = result.ok;
          // Only 'permission' means the OS actually denied access. 'busy'
          // means start() was called while a session was already active —
          // surfacing that as "microphone needed" would falsely tell the
          // user to go re-grant a permission they already have.
          if (!result.ok) {
            if (result.reason === 'permission') onPermissionDenied();
            return;
          }
          // The finger already lifted (or the gesture was interrupted) while
          // we were awaiting start() — most commonly because the OS
          // permission dialog was still on screen. Resolve it now instead of
          // leaving the recording running with no gesture left to stop it.
          if (pendingEndRef.current) await resolvePendingEnd();
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
          if (!startedRef.current) {
            pendingEndRef.current = cancelRef.current ? 'cancel' : 'stop';
            return;
          }
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
          if (!startedRef.current) {
            pendingEndRef.current = 'cancel';
            return;
          }
          await recorder.cancel();
          setWillCancel(false);
        },
      }),
    // recorder methods are stable (useCallback); safe to build once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const recording = recorder.isRecording;

  // IMPORTANT: this used to be two separate `return` statements (one for the
  // recording state, one for idle) built from entirely different JSX trees.
  // Since the mic touchable was a different element instance in each tree,
  // React unmounted and remounted it the instant recording began — which
  // tore down the in-progress PanResponder gesture mid-touch. The result:
  // releasing or sliding the finger no longer reached the handlers that stop
  // or cancel the recording, and the next press saw a still-active recorder
  // and reported it as if the mic permission had been denied. Rendering one
  // stable tree (the mic box always the same element; only its contents and
  // style change) keeps the gesture alive across the whole press-hold-release.
  return (
    <View style={styles.bar}>
      {recording ? (
        <Animated.View style={[styles.recording, { transform: [{ translateX: slideX }] }]}>
          <View style={styles.recDot} />
          <Text style={styles.recTime}>{formatDuration(recorder.elapsedMs)}</Text>
          <Text style={[styles.recHint, willCancel && styles.recHintActive]}>
            {willCancel ? 'Release to cancel' : '‹ Slide to cancel'}
          </Text>
        </Animated.View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.camera}
            onPress={onOpenCamera}
            accessibilityLabel="Take a photo note"
          >
            <CameraIcon color={colors.textDim} size={22} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
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
        </>
      )}

      {!recording && canSend ? (
        <TouchableOpacity style={styles.send} onPress={send} accessibilityLabel="Send note">
          <Text style={styles.sendGlyph}>↑</Text>
        </TouchableOpacity>
      ) : (
        <View
          style={[styles.mic, recording && styles.micActive, recording && willCancel && styles.micCancel]}
          {...panResponder.panHandlers}
        >
          {recording ? (
            <Text style={styles.micGlyph}>{willCancel ? '✕' : '●'}</Text>
          ) : (
            <MicIcon color={colors.textDim} size={22} />
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
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
    fontFamily: fonts.body,
    fontSize: 16,
    marginRight: spacing.sm,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
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
    fontFamily: fonts.mono,
    color: colors.text,
    fontSize: 16,
    marginRight: spacing.md,
  },
  recHint: {
    fontFamily: fonts.body,
    color: colors.textDim,
    fontSize: 13,
    flex: 1,
  },
  recHintActive: {
    color: colors.danger,
    fontWeight: '700',
  },
  });
