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
import { parseMediaUris, type Note } from '../db/types';
import { formatClock, formatDayHeader } from '../utils/date';
import { colors, radius, spacing } from '../theme';

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
      <View style={styles.header}>
        <Text style={styles.title}>View All</Text>
      </View>

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
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {search.trim() ? 'No notes match your search.' : 'No notes yet.'}
            </Text>
          </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  search: {
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
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.bubbleOwn },
  chipText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  listContent: { padding: spacing.md, gap: spacing.sm },
  emptyContent: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardDay: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  cardTime: { color: colors.textFaint, fontSize: 12, fontVariant: ['tabular-nums'] },
  cardText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 15 },
});
