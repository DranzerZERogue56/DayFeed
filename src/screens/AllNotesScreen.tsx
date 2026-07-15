import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotes } from '../hooks/NotesContext';
import { useAllNotes } from '../hooks/useQueries';
import VoicePlayerRow from '../components/VoicePlayerRow';
import TranscribeButton from '../components/TranscribeButton';
import PhotoGrid from '../components/PhotoGrid';
import PhotoViewer from '../components/PhotoViewer';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { parseMediaUris, type Note } from '../db/types';
import { formatClock, formatDayHeader } from '../utils/date';
import { colors, fonts, radius, shadows, spacing, type } from '../theme';

type Filter = 'all' | 'text' | 'voice' | 'photo';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'text', label: 'Text' },
  { key: 'voice', label: 'Voice' },
  { key: 'photo', label: 'Photo' },
];

// View All: every note newest-first, with type chips + case-insensitive search
// over content and transcript. Filters and search combine.
export default function AllNotesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  const { removeNote } = useNotes();

  const opts = useMemo(
    () => ({
      type: filter === 'all' ? undefined : filter,
      search: search.trim() || undefined,
    }),
    [filter, search],
  );
  const { notes } = useAllNotes(opts);

  const confirmDelete = (note: Note) => {
    Alert.alert('Delete note?', 'This note will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNote(note.id) },
    ]);
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
            onLongPress={() => confirmDelete(item)}
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
              <PhotoGrid
                uris={parseMediaUris(item)}
                onOpen={(index) =>
                  setViewer({ uris: parseMediaUris(item), index })
                }
              />
            ) : (
              <Text style={styles.cardText}>{item.content}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
