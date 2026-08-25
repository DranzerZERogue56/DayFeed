import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadVoiceEngine, saveVoiceEngine, type VoiceEngine } from '../lib/voiceEngine';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fires after a change so callers can pick up the new engine. */
  onEngineChanged?: (engine: VoiceEngine) => void;
}

interface EngineOption {
  value: VoiceEngine;
  label: string;
  detail: string;
}

// Deliberately concrete about the consequence rather than the mechanism —
// "needs internet" is the thing that will bite on a drive with no signal.
const ENGINES: EngineOption[] = [
  {
    value: 'flow',
    label: 'Wispr Flow',
    detail:
      'Tap the Flow bubble when the dictation field opens, then speak. Needs an internet connection, and does not work while a VPN is on.',
  },
  {
    value: 'whisper',
    label: 'Built-in whisper',
    detail:
      'DayFeed records and transcribes on the phone. Works with no signal. Stops when you pause.',
  },
];

// Settings. A screen rather than a sheet, but presented as a full-screen modal
// from Feed's header — the tab bar is full at seven, and RootTabs already
// records that the seventh truncated "View All" to "View …".
// NotedUpdatesScreen is the same shape: a file in screens/ shown as an overlay.
export default function SettingsScreen({ visible, onClose, onEngineChanged }: Props) {
  const styles = useStyles(makeStyles);
  const [engine, setEngine] = useState<VoiceEngine | null>(null);

  // Re-read on open rather than trusting a value from a previous visit.
  useEffect(() => {
    if (visible) void loadVoiceEngine().then(setEngine);
  }, [visible]);

  const choose = async (next: VoiceEngine) => {
    if (next === engine) return;
    setEngine(next);
    await saveVoiceEngine(next);
    onEngineChanged?.(next);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back to Feed">
            <Text style={styles.back}>‹ Feed</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>DICTATION ENGINE</Text>
          <Text style={styles.sectionHint}>
            What turns your voice into a note when you tap the dictate button.
          </Text>

          {ENGINES.map((option) => {
            const selected = engine === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => void choose(option.value)}
                accessibilityLabel={`Use ${option.label} for dictation`}
                accessibilityState={{ selected }}
              >
                <View style={styles.optionHead}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  {selected && <Text style={styles.tick}>✓</Text>}
                </View>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Written here, where the choice is made, rather than buried in a
              commit message. DayFeed itself still talks to nothing — but its
              "no network, no accounts" promise stops covering your voice the
              moment Flow is the engine, and that is worth knowing plainly. */}
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>About Wispr Flow</Text>
            <Text style={styles.noticeBody}>
              Flow is a separate app. It isn’t a keyboard — it’s a floating bubble that spots a
              focused text field and types into it, so DayFeed can’t call it directly. It opens the
              field and stays out of the way, and never takes the microphone while Flow is the
              engine.
              {'\n\n'}
              Flow sends your speech to its own servers to transcribe. DayFeed still stores
              everything on the phone and talks to nothing itself, but audio dictated through Flow
              does leave the device. Built-in whisper never does.
              {'\n\n'}
              Flow’s bubble does not appear while a VPN is running — this was confirmed on this
              phone with Tailscale, in every app, not just DayFeed. If you dictate on the VPN, use
              built-in whisper.
            </Text>
          </View>
        </ScrollView>
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
    back: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
    // Balances the back button so the title stays optically centred.
    headerSpacer: { width: 52 },
    body: { padding: spacing.lg, paddingBottom: spacing.xl },
    sectionLabel: {
      fontFamily: fonts.mono,
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 1,
    },
    sectionHint: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    option: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    optionSelected: {
      borderColor: colors.accentEdge,
      backgroundColor: colors.accentTint,
    },
    optionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionLabel: { fontFamily: fonts.display, color: colors.text, fontSize: 16 },
    optionLabelSelected: { color: colors.accent },
    tick: { fontFamily: fonts.body, color: colors.accent, fontSize: 16, fontWeight: '700' },
    optionDetail: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
    notice: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceAlt,
    },
    noticeTitle: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: 14,
      marginBottom: spacing.xs,
    },
    noticeBody: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 20,
    },
  });
