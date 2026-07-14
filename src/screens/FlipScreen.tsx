import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import DayPage from '../components/DayPage';
import DatePickerModal from '../components/DatePickerModal';
import { useDayKeysWithNotes } from '../hooks/useQueries';
import type { RootTabParamList } from '../navigation/types';
import { addDaysToKey, dayDiff, formatDayHeader, todayKey } from '../utils/date';
import { colors, spacing } from '../theme';

// Build a contiguous list of day_keys from start..end (inclusive).
function rangeKeys(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (dayDiff(cur, end) >= 0 && guard < 4000) {
    out.push(cur);
    cur = addDaysToKey(cur, 1);
    guard++;
  }
  return out.length ? out : [start];
}

// Flip: swipe day-by-day through a paper notebook. Today is the initial page;
// empty days still render (blank page) so the paging feels continuous.
export default function FlipScreen() {
  const dayKeys = useDayKeysWithNotes();
  const markedSet = useMemo(() => new Set(dayKeys), [dayKeys]);
  const route = useRoute<RouteProp<RootTabParamList, 'Flip'>>();

  const [bounds, setBounds] = useState(() => ({ start: todayKey(), end: todayKey() }));
  const [currentKey, setCurrentKey] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentKeyRef = useRef(currentKey);
  const pagerRef = useRef<PagerView>(null);

  const days = useMemo(() => rangeKeys(bounds.start, bounds.end), [bounds]);

  // Expand the visible range to include the earliest note and today.
  useEffect(() => {
    const t = todayKey();
    const earliest = dayKeys.length ? dayKeys[0] : t;
    setBounds((b) => {
      const start = dayDiff(earliest, b.start) > 0 ? earliest : b.start; // earlier wins
      const end = dayDiff(b.end, t) > 0 ? t : b.end; // later wins
      return start === b.start && end === b.end ? b : { start, end };
    });
  }, [dayKeys]);

  // Keep the same day in view whenever the range rebuilds (initial load / expand).
  useEffect(() => {
    const idx = days.indexOf(currentKeyRef.current);
    if (idx >= 0) {
      const t = setTimeout(() => pagerRef.current?.setPageWithoutAnimation(idx), 0);
      return () => clearTimeout(t);
    }
  }, [days]);

  const setCurrent = (key: string) => {
    currentKeyRef.current = key;
    setCurrentKey(key);
  };

  const goToKey = (key: string) => {
    setPickerOpen(false);
    const needStart = dayDiff(key, bounds.start) > 0; // key earlier than start
    const needEnd = dayDiff(bounds.end, key) > 0; // key later than end
    setCurrent(key);
    if (needStart || needEnd) {
      // Effect above repositions once the wider range is built.
      setBounds({
        start: needStart ? key : bounds.start,
        end: needEnd ? key : bounds.end,
      });
    } else {
      const idx = days.indexOf(key);
      if (idx >= 0) pagerRef.current?.setPageWithoutAnimation(idx);
    }
  };

  // Deep-link from the Agenda tab: jump to the requested day. `ts` changes each
  // navigation so repeat taps on the same day still fire.
  const jumpTo = route.params?.jumpTo;
  const jumpTs = route.params?.ts;
  useEffect(() => {
    if (jumpTo) goToKey(jumpTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo, jumpTs]);

  const initialIndex = Math.max(0, days.indexOf(currentKey));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{formatDayHeader(currentKey)}</Text>
          <Text style={styles.subtitle}>{currentKey}</Text>
        </View>
        <TouchableOpacity
          style={styles.calBtn}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel="Jump to date"
        >
          <Text style={styles.calGlyph}>📅</Text>
        </TouchableOpacity>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialIndex}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          const key = days[pos];
          if (key) setCurrent(key);
        }}
      >
        {days.map((k) => (
          <View key={k} style={styles.pageHolder} collapsable={false}>
            <DayPage dayKey={k} />
          </View>
        ))}
      </PagerView>

      <DatePickerModal
        visible={pickerOpen}
        selectedKey={currentKey}
        markedKeys={markedSet}
        onSelect={goToKey}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  calBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calGlyph: { fontSize: 20 },
  pager: { flex: 1 },
  pageHolder: { flex: 1 },
});
