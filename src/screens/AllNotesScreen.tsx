import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNotes } from '../hooks/NotesContext';
import { useFlop } from '../hooks/FlopContext';
import { useAllNotes } from '../hooks/useQueries';
import { flopTitle } from '../db/flopTypes';
import type { RootTabParamList } from '../navigation/types';
import VoicePlayerRow from '../components/VoicePlayerRow';
import TranscribeButton from '../components/TranscribeButton';
import PhotoGrid from '../components/PhotoGrid';
import PhotoViewer from '../components/PhotoViewer';
import OcrControl from '../components/OcrControl';
import MarkdownText from '../components/MarkdownText';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import NoteActionsSheet from '../components/NoteActionsSheet';
import { toggleCheckboxLine } from '../lib/markdownList';
import { parseMediaUris, type Note } from '../db/types';
import { formatClock, formatDayHeader } from '../utils/date';
import { fonts, radius, shadows, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

type Filter = 'all' | 'text' | 'voice' | 'photo';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'text', label: 'Text' },
  { key: 'voice', label: 'Voice' },
  { key: 'photo', label: 'Photo' },
];

// A photo note's card body: thumbnails + OCR control, with its own collapse
// state (each card needs one, so this can't be inlined into renderItem —
// hooks require an actual component).
function PhotoNoteBody({
  note,
  onOpen,
  styles,
}: {
  note: Note;
  onOpen: (index: number) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { saveOcrText } = useNotes();
  const [collapsed, setCollapsed] = useState(false);
  const media = parseMediaUris(note);

  if (note.ocr_text) {
    return (
      <>
        <OcrControl
          mediaUris={media}
          ocrText={note.ocr_text}
          onExtracted={(text) => saveOcrText(note, text)}
        />
        <TouchableOpacity onPress={() => setCollapsed((c) => !c)}>
          <Text style={styles.toggleLink}>
            {collapsed ? `Show photos (${media.length})` : 'Hide photos'}
          </Text>
        </TouchableOpacity>
        {!collapsed && (
          <View style={styles.photosGap}>
            <PhotoGrid uris={media} onOpen={onOpen} />
          </View>
        )}
      </>
    );
  }

  return (
    <>
      <PhotoGrid uris={media} onOpen={onOpen} />
      <OcrControl
        mediaUris={media}
        ocrText={note.ocr_text}
        onExtracted={(text) => saveOcrText(note, text)}
      />
    </>
  );
}

// View All: every note newest-first, with type chips + case-insensitive search
// over content and transcript. Filters and search combine.
export default function AllNotesScreen() {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  const { removeNote, editNoteContent } = useNotes();
  const { promoteNote } = useFlop();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const opts = useMemo(
    () => ({
      type: filter === 'all' ? undefined : filter,
      search: search.trim() || undefined,
    }),
    [filter, search],
  );
  const { notes } = useAllNotes(opts);

  const [active, setActive] = useState<Note | null>(null);
  const [sheet, setSheet] = useState<'menu' | 'confirm' | 'sent' | null>(null);
  const [sentTitle, setSentTitle] = useState('');

  const sendToFlop = async (note: Note) => {
    const flop = await promoteNote(note);
    if (!flop) return;
    setSentTitle(flopTitle(flop));
    setSheet('sent');
  };

  // Photo notes keep the one-step delete; Flop has no photo type to promote to.
  const showActions = (note: Note) => {
    setActive(note);
    setSheet(note.type === 'photo' ? 'confirm' : 'menu');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader overline="Every note, newest first" title="View All" />

      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes…"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <View style={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={
          notes.length === 0 ? styles.emptyContent : styles.listContent
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title={search.trim() ? 'No notes match your search.' : 'No notes yet.'}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => showActions(item)}
            delayLongPress={350}
            style={styles.card}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardDay}>{formatDayHeader(item.day_key)}</Text>
              <Text style={styles.cardTime}>{formatClock(item.created_at)}</Text>
            </View>
            {item.type === 'voice' ? (
              <>
                <VoicePlayerRow note={item} variant="list" />
                <TranscribeButton note={item} tone="list" />
              </>
            ) : item.type === 'photo' ? (
              <PhotoNoteBody
                note={item}
                onOpen={(index) => setViewer({ uris: parseMediaUris(item), index })}
                styles={styles}
              />
            ) : (
              <MarkdownText
                content={item.content ?? ''}
                textStyle={styles.cardText}
                onToggleCheckbox={(lineIndex) =>
                  editNoteContent(item, toggleCheckboxLine(item.content ?? '', lineIndex))
                }
              />
            )}
          </TouchableOpacity>
        )}
      />

      {viewer && (
        <PhotoViewer
          uris={viewer.uris}
          initialIndex={viewer.index}
          visible={!!viewer}
          onClose={() => setViewer(null)}
        />
      )}

      <NoteActionsSheet
        visible={sheet === 'menu'}
        actions={[
          { label: 'Send to Flop', onPress: () => active && void sendToFlop(active) },
          { label: 'Delete…', danger: true, onPress: () => setSheet('confirm') },
        ]}
        onClose={() => setSheet(null)}
      />
      <NoteActionsSheet
        visible={sheet === 'confirm'}
        subtitle="This note will be permanently removed."
        actions={[
          { label: 'Delete', danger: true, onPress: () => active && removeNote(active.id) },
        ]}
        onClose={() => setSheet(null)}
      />
      <NoteActionsSheet
        visible={sheet === 'sent'}
        subtitle={`“${sentTitle}” is now a Flop root note.`}
        actions={[{ label: 'Open Flop', onPress: () => navigation.navigate('Flop') }]}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  search: {
    fontFamily: fonts.body,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  // Small-caps mono chips — index-card tab labels rather than app buttons.
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipTextActive: { color: '#FFFFFF' },
  listContent: { padding: spacing.md, gap: spacing.md },
  emptyContent: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    ...shadows.card,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDay: {
    fontFamily: fonts.display,
    color: colors.textDim,
    fontSize: type.timestamp,
  },
  cardTime: { fontFamily: fonts.mono, color: colors.textFaint, fontSize: 12 },
  cardText: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: type.noteBody,
    lineHeight: 25,
  },
  toggleLink: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  photosGap: {
    marginTop: spacing.sm,
  },
});
