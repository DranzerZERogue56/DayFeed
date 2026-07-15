import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CHILD_RELATIONS, totalCount, type RelationCounts } from '../db/flopTypes';
import { fonts, radius, relationStyle } from '../theme';

// Direct-child counts, one small chip per non-empty relation (e.g. ↑3 ⑂2 ←1), so
// a glance at a card shows the shape of the argument. Icon + count, tinted fill.
export default function RelationChips({ counts }: { counts: RelationCounts }) {
  if (totalCount(counts) === 0) return null;

  return (
    <View style={styles.row}>
      {CHILD_RELATIONS.filter((r) => counts[r] > 0).map((r) => {
        const style = relationStyle[r];
        return (
          <View
            key={r}
            style={[styles.chip, { backgroundColor: style.tint }]}
            accessibilityLabel={`${counts[r]} ${style.label}`}
          >
            <Text style={[styles.text, { color: style.color }]}>
              {style.icon}
              {counts[r]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5 },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
});
