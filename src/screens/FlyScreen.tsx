import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import CaptureBar from '../components/CaptureBar';
import DatePickerModal from '../components/DatePickerModal';
import EmptyState from '../components/EmptyState';
import FlyPromptSheet, { loadFlyPrompt } from '../components/FlyPromptSheet';
import FlyStoryCard from '../components/FlyStoryCard';
import MarkdownText from '../components/MarkdownText';
import NoteActionsSheet from '../components/NoteActionsSheet';
import ScreenHeader from '../components/ScreenHeader';
import VoiceNoteBody from '../components/VoiceNoteBody';
import { TranscribeControl } from '../components/TranscribeButton';
import { CalendarIcon } from '../components/Icons';
import {
  countFlyNotesForDay,
  createFlyNote,
  deleteFlyNote,
  getFlyNote,
  setFlyTranscript,
} from '../db/flyNotes';
import { deleteFlyStory, getFlyStory, saveFlyStory } from '../db/flyStories';
import type { FlyNote } from '../db/flyTypes';
import { DEFAULT_FLY_PROMPT, buildFlyClipboard, untranscribedCount } from '../lib/flyPrompt';
import { enqueueFlyTranscription } from '../lib/flyTranscribeQueue';
import { useFlyDayKeys, useFlyDayNotes, useFlyStory } from '../hooks/useFlyQueries';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import type { RecorderResult } from '../hooks/useRecorder';
import { addDaysToKey, formatClock, formatDayHeader, todayKey } from '../utils/date';
import { deleteAudioFile, persistRecording } from '../utils/audioFiles';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';

// Fly: the daily journal. Text notes and voice memos written across a day, kept
// in their own table so they never surface in the Feed, the Agenda or search.
//
// One day is on screen at a time — Fly is a board you add to and then read
// back, not a stream you scroll. Deliberately no PagerView: Flip owns the
// page-turn feel, and paging here would put a swipe gesture on top of the tab
// swipe bar.
//
// Fly has no provider of its own (unlike Notes and Flop) because it has exactly
// one screen. `version` below is the mutation counter the queries re-read on.
export default function FlyScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  const [dayKey, setDayKey] = useState(todayKey());
  const [version, setVersion] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FlyNote | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemoveStory, setConfirmRemoveStory] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_FLY_PROMPT);
  // Yesterday's key, held only while the nudge is worth showing. Dismissal is
  // per-session on purpose: an unfinished day is worth mentioning again
  // tomorrow, and persisting a dismissal would need a table of its own.
  const [nudgeKey, setNudgeKey] = useState<string | null>(null);

  const { notes } = useFlyDayNotes(dayKey, version);
  const dayKeys = useFlyDayKeys(version);
  const story = useFlyStory(dayKey, version);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    void loadFlyPrompt().then(setPrompt);
  }, []);

  // Yesterday had entries but was never consolidated — worth one quiet line.
  // Checked once at mount rather than on every version bump: today's writing
  // says nothing about yesterday.
  useEffect(() => {
    let alive = true;
    const key = addDaysToKey(todayKey(), -1);
    void (async () => {
      const [count, existing] = await Promise.all([
        countFlyNotesForDay(key),
        getFlyStory(key),
      ]);
      if (alive && count > 0 && !existing) setNudgeKey(key);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onSendText = async (text: string) => {
    await createFlyNote({ type: 'text', content: text });
    bump();
  };

  const onRecorded = async (result: RecorderResult) => {
    const id = randomUUID();
    const uri = await persistRecording(result.uri, id);
    const note = await createFlyNote({
      type: 'voice',
      audio_uri: uri,
      duration_ms: result.durationMs,
    });
    bump();
    // Transcribe without being asked: an untranscribed memo is a hole in the
    // day's story. Queued, not awaited — only one native job runs at a time.
    enqueueFlyTranscription(note.id, uri, bump);
  };

  const onPermissionDenied = () => {
    Alert.alert(
      'Microphone needed',
      'DayFeed needs microphone access to record voice memos. Enable it in Settings to use voice capture.',
    );
  };

  // Re-read the row before deleting: the note in state may predate a transcript
  // written since, and the audio file has to go with it or it strands on disk.
  const onDelete = async (note: FlyNote) => {
    const existing = await getFlyNote(note.id);
    if (existing?.audio_uri) await deleteAudioFile(existing.audio_uri);
    await deleteFlyNote(note.id);
    setPendingDelete(null);
    bump();
  };

  const onTranscribed = async (note: FlyNote, text: string) => {
    await setFlyTranscript(note.id, text);
    bump();
  };

  // Copy the day out for a Claude session to turn into prose. The story is
  // generated outside the app on purpose — see lib/flyPrompt.ts.
  const onCopyDay = async () => {
    if (notes.length === 0) return;
    const pending = untranscribedCount(notes);
    await Clipboard.setStringAsync(buildFlyClipboard(prompt, dayKey, notes));
    setNotice(
      pending > 0
        ? `Copied the day, but ${pending} voice memo${pending === 1 ? '' : 's'} ${
            pending === 1 ? 'has' : 'have'
          } no transcript yet and ${pending === 1 ? "isn't" : "aren't"} in it.`
        : 'Copied the day. Paste it into a Claude session, then paste the story back.',
    );
  };

  // Read the story back off the clipboard. Overwrites any existing one for the
  // day — regenerating is expected, and the card offers Edit for touch-ups.
  const onPasteStory = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) {
      setNotice('The clipboard is empty.');
      return;
    }
    await saveFlyStory(dayKey, text);
    bump();
  };

  const onSaveStory = async (content: string) => {
    await saveFlyStory(dayKey, content);
    bump();
  };

  const onRemoveStory = async () => {
    await deleteFlyStory(dayKey);
    setConfirmRemoveStory(false);
    bump();
  };

  // Today is the far edge — Fly records days that happened, so there is nothing
  // to write on tomorrow.
  const atToday = dayKey === todayKey();

  // An entry written after the story was saved means the story no longer covers
  // the day. Say so rather than silently regenerating, which would throw away
  // any edit made to it.
  const storyStale =
    story !== null && notes.some((n) => n.created_at > story.updated_at);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        overline="Daily journal"
        title="Fly"
        action={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.promptBtn}
              onPress={() => setPromptOpen(true)}
              accessibilityLabel="Edit the engine prompt"
            >
              <Text style={styles.promptBtnText}>Prompt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calBtn}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel="Jump to date"
            >
              <CalendarIcon color={colors.accent} size={18} />
            </TouchableOpacity>
          </View>
        }
      />

      {nudgeKey && nudgeKey !== dayKey && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>Yesterday was never consolidated.</Text>
          <TouchableOpacity onPress={() => setDayKey(nudgeKey)} hitSlop={8}>
            <Text style={styles.nudgeLink}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNudgeKey(null)} hitSlop={8}>
            <Text style={styles.nudgeDismiss}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.dayBar}>
        <TouchableOpacity
          onPress={() => setDayKey((k) => addDaysToKey(k, -1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Previous day"
        >
          <Text style={styles.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dayLabel} numberOfLines={1}>
          {formatDayHeader(dayKey)}
        </Text>
        <TouchableOpacity
          onPress={() => setDayKey((k) => addDaysToKey(k, 1))}
          disabled={atToday}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Next day"
        >
          <Text style={[styles.arrow, atToday && styles.arrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 'padding' on both platforms, as on Feed: Android edge-to-edge no longer
          resizes the window for the keyboard, so the capture bar would sit
          hidden behind it while typing. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {notes.length === 0 && !story ? (
          <EmptyState
            title="Nothing written yet."
            hint="Jot what just happened, or hold the mic. At the end of the day it becomes a story."
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {story && (
              <FlyStoryCard
                story={story}
                stale={storyStale}
                onSave={onSaveStory}
                onDelete={() => setConfirmRemoveStory(true)}
              />
            )}
            {notes.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={styles.entry}
                activeOpacity={1}
                onLongPress={() => setPendingDelete(n)}
                accessibilityLabel={`Fly entry at ${formatClock(n.created_at)}`}
              >
                <Text style={styles.time}>{formatClock(n.created_at)}</Text>
                {n.type === 'voice' ? (
                  <VoiceNoteBody note={n}>
                    {/* TranscribeControl rather than TranscribeButton: the
                        button binds to the `notes` table, and a Fly transcript
                        must land in fly_notes and never feed the Agenda. No
                        `trailing` — Fly prints its timestamp above, as Flip
                        does. */}
                    <TranscribeControl
                      audioUri={n.audio_uri}
                      transcript={n.transcript}
                      onTranscribed={(text) => onTranscribed(n, text)}
                    />
                  </VoiceNoteBody>
                ) : (
                  <MarkdownText content={n.content ?? ''} textStyle={styles.entryText} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* The end-of-day pass. Hidden on an empty day so a blank board isn't
            offering to consolidate nothing. */}
        {notes.length > 0 && (
          <View style={styles.consolidateBar}>
            <TouchableOpacity
              style={styles.consolidateBtn}
              onPress={() => void onCopyDay()}
              accessibilityLabel="Copy the day for consolidation"
            >
              <Text style={styles.consolidateText}>Copy day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.consolidateBtn}
              onPress={() => void onPasteStory()}
              accessibilityLabel="Paste the story back in"
            >
              <Text style={styles.consolidateText}>
                {story ? 'Replace story' : 'Paste story'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Capture only on today. createFlyNote derives day_key from now, so a
            memo recorded while viewing an earlier day would file itself under
            today and vanish from the board on screen. Writing it to the viewed
            day instead would be worse: created_at is still the current clock
            time, so "yesterday at 9am" would sort into the story at 4pm. A past
            day is for reading and consolidating. */}
        {atToday ? (
          <CaptureBar
            onSendText={(text) => void onSendText(text)}
            onRecorded={onRecorded}
            onPermissionDenied={onPermissionDenied}
            placeholder="What just happened…"
          />
        ) : (
          <TouchableOpacity
            style={styles.pastBar}
            onPress={() => setDayKey(todayKey())}
            accessibilityLabel="Back to today to write"
          >
            <Text style={styles.pastBarText}>
              A past day — <Text style={styles.pastBarLink}>go to today</Text> to write.
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={pickerOpen}
        selectedKey={dayKey}
        markedKeys={new Set(dayKeys)}
        onSelect={(key) => {
          setDayKey(key);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <NoteActionsSheet
        visible={pendingDelete !== null}
        subtitle={
          pendingDelete ? `Entry from ${formatClock(pendingDelete.created_at)}.` : ''
        }
        actions={
          pendingDelete
            ? [
                {
                  label: 'Delete entry',
                  danger: true,
                  onPress: () => void onDelete(pendingDelete),
                },
              ]
            : []
        }
        onClose={() => setPendingDelete(null)}
      />

      <NoteActionsSheet
        visible={notice !== null}
        subtitle={notice ?? ''}
        actions={[]}
        onClose={() => setNotice(null)}
      />

      <NoteActionsSheet
        visible={confirmRemoveStory}
        subtitle="The story is removed. The entries it was made from stay."
        actions={[
          { label: 'Remove story', danger: true, onPress: () => void onRemoveStory() },
        ]}
        onClose={() => setConfirmRemoveStory(false)}
      />

      <FlyPromptSheet
        visible={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSaved={setPrompt}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    // Sized tight, as on Feed: these sit beside the title and a few pixels
    // either way decides whether "Fly" keeps its single line.
    promptBtn: {
      paddingVertical: 5,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    promptBtnText: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    nudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.accentTint,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.accentEdge,
    },
    nudgeText: {
      flex: 1,
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 12,
    },
    nudgeLink: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    nudgeDismiss: {
      fontFamily: fonts.body,
      color: colors.textFaint,
      fontSize: 18,
      lineHeight: 18,
    },
    calBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.label,
      letterSpacing: 0.3,
    },
    arrow: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 24,
      // Fixed width so the centred date doesn't shift when one arrow dims.
      minWidth: 24,
      textAlign: 'center',
    },
    arrowDisabled: { color: colors.textFaint },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    entry: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    time: {
      fontFamily: fonts.mono,
      color: colors.textDim,
      fontSize: 11,
      marginBottom: 3,
    },
    pastBar: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    pastBarText: {
      fontFamily: fonts.body,
      color: colors.textDim,
      fontSize: 13,
    },
    pastBarLink: {
      color: colors.accent,
      fontWeight: '700',
    },
    consolidateBar: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    consolidateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    consolidateText: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    entryText: {
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
    },
  });
