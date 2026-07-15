import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RelationChips from '../components/RelationChips';
import FlopComposer from '../components/FlopComposer';
import { useRootFlopNotes } from '../hooks/useFlopQueries';
import { flopBody, flopTitle } from '../db/flopTypes';
import { formatFlopStamp } from '../utils/date';
import type { FlopStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing, type } from '../theme';

// Flop root list: every root-level note, newest-touched first. The first line is
// the title; the rest previews beneath it. Relation chips show the argument's shape.
export default function FlopListScreen() {
  const { roots, loading } = useRootFlopNotes();
  const [composing, setComposing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<FlopStackParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Flop</Text>
        <TouchableOpacity
          style={styles.add}
          onPress={() => setComposing(true)}
          accessibilityLabel="New Flop note"
        >
          <Text style={styles.addGlyph}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={roots}
        keyExtractor={(n) => n.id}
        contentContainerStyle={roots.length === 0 ? styles.emptyContent : styles.listContent}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No Flop notes yet.</Text>
              <Text style={styles.emptyHint}>
                Flop is for the long thoughts — the ones that outlive a day.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const preview = flopBody(item);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('FlopNote', { id: item.id })}
            >
              <Text style={styles.cardTitle} numberOfLines={2}>
                {flopTitle(item)}
              </Text>
              {!!preview && (
                <Text style={styles.cardPreview} numberOfLines={2}>
                  {preview}
                </Text>
              )}
              <View style={styles.cardFoot}>
                <Text style={styles.stamp}>{formatFlopStamp(item.updated_at)}</Text>
                <RelationChips counts={item.counts} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <FlopComposer visible={composing} onClose={() => setComposing(false)} parentId={null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  screenTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.screenTitle,
    letterSpacing: 0.3,
  },
  add: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGlyph: { color: colors.accent, fontSize: 22, lineHeight: 24, fontWeight: '700' },
  listContent: { padding: spacing.md, gap: spacing.md },
  emptyContent: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
  },
  cardPreview: {
    fontFamily: fonts.body,
    color: colors.textFaint,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  stamp: { fontFamily: fonts.mono, color: colors.textFaint, fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
  emptyHint: {
    fontFamily: fonts.body,
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
