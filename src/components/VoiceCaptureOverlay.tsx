import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useVoiceCapture,
  useVoiceCaptureState,
} from '../hooks/VoiceCaptureContext';
import { VOICE_DESTINATIONS } from '../lib/voiceRouting';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { MicIcon } from './Icons';

// The listening surface. Full-screen while it is actually listening or
// asking a question; a small bottom bar once the note is already filed, so a
// routed save never blocks what you were doing.

const BARS = 5;

/** A row of bars that breathe with the mic level. */
function Waveform({ level, color }: { level: number; color: string }) {
  // One Animated.Value per bar, created once. Driving these with state would
  // re-render the overlay on every frame of every animation.
  const values = useRef(Array.from({ length: BARS }, () => new Animated.Value(0.2))).current;

  useEffect(() => {
    // Middle bars react most, so the row reads as a voice rather than a meter.
    const weights = [0.45, 0.75, 1, 0.75, 0.45];
    const animations = values.map((value, i) =>
      Animated.timing(value, {
        toValue: Math.max(0.15, Math.min(1, level * weights[i])),
        duration: 90,
        // scaleY is a transform, so this runs on the UI thread and keeps
        // animating smoothly while JS is busy decoding the next PCM chunk.
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [level, values]);

  return (
    <View style={waveStyles.row}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: value }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 8,
  },
  bar: {
    width: 6,
    height: 64,
    borderRadius: 3,
  },
});

export default function VoiceCaptureOverlay() {
  const { phase, level, heard, transcript, savedTo, error } = useVoiceCaptureState();
  const { finishNow, chooseDestination, undoSave, dismiss } = useVoiceCapture();
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  if (phase === 'idle') return null;

  // A filed note gets a bar, not a takeover: you already said where it goes,
  // so the only job left is to show what was heard and offer a way back.
  if (phase === 'saved') {
    return (
      <View style={styles.barWrap} pointerEvents="box-none">
        <SafeAreaView edges={['top']} pointerEvents="box-none">
          <View style={styles.savedBar}>
            <View style={styles.savedText}>
              <Text style={styles.savedTo}>Saved to {savedTo}</Text>
              <Text style={styles.savedQuote} numberOfLines={2}>
                {transcript}
              </Text>
            </View>
            <TouchableOpacity onPress={undoSave} hitSlop={10} accessibilityLabel="Undo saved note">
              <Text style={styles.undo}>Undo</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.scrim}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {phase === 'listening' && (
            <>
              <Text style={styles.title}>{heard ? 'Listening…' : 'Say something'}</Text>
              <Waveform level={level} color={colors.voiceAccent} />
              <Text style={styles.hint}>
                {heard ? 'Stops on its own when you pause.' : 'End with “to Feed” or “to Flop”.'}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.ghost} onPress={dismiss}>
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primary} onPress={finishNow} disabled={!heard}>
                  <Text style={[styles.primaryText, !heard && styles.primaryTextOff]}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {phase === 'transcribing' && (
            <>
              <Text style={styles.title}>Transcribing…</Text>
              <View style={styles.spinner}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
              <Text style={styles.hint}>Running on the phone. No network involved.</Text>
              {/* Whisper cannot be interrupted, so this abandons the result
                  rather than stopping the work — but without it a slow or
                  stuck transcription leaves no way off this screen. */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.ghost} onPress={dismiss}>
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {phase === 'confirming' && (
            <>
              <Text style={styles.title}>Where does this go?</Text>
              <Text style={styles.quote}>{transcript}</Text>
              <View style={styles.destinations}>
                {VOICE_DESTINATIONS.map((destination) => (
                  <TouchableOpacity
                    key={destination}
                    style={styles.destination}
                    onPress={() => chooseDestination(destination)}
                  >
                    <Text style={styles.destinationText}>{destination}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.ghostWide} onPress={dismiss}>
                <Text style={styles.ghostText}>Discard</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'error' && (
            <>
              <View style={styles.errorIcon}>
                <MicIcon color={colors.textFaint} size={32} />
              </View>
              <Text style={styles.title}>{error}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.ghost} onPress={dismiss}>
                  <Text style={styles.ghostText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    title: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.label,
      textAlign: 'center',
    },
    hint: {
      fontFamily: fonts.body,
      color: colors.textFaint,
      fontSize: type.timestamp,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    quote: {
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    spinner: {
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorIcon: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    ghost: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    ghostWide: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
    },
    ghostText: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 15,
      fontWeight: '700',
    },
    primary: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    primaryText: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    primaryTextOff: {
      color: colors.textFaint,
    },
    destinations: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    destination: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      alignItems: 'center',
    },
    destinationText: {
      fontFamily: fonts.display,
      color: colors.accent,
      fontSize: 16,
    },
    // Anchored to the top, not the bottom: a bottom bar would sit on the tab
    // bar and block navigation for the six seconds the undo is offered.
    barWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    savedBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
    },
    savedText: {
      flex: 1,
    },
    savedTo: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    savedQuote: {
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: 14,
      marginTop: 2,
    },
    undo: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
  });
