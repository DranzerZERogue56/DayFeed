import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import DayPage from '../components/DayPage';
import DatePickerModal from '../components/DatePickerModal';
import { useDayKeysWithNotes } from '../hooks/useQueries';
import type { RootTabParamList } from '../navigation/types';
import { addDaysToKey, dayDiff, formatDayHeader, todayKey } from '../utils/date';
import { colors, fonts, spacing, type } from '../theme';

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

  // Signature moment: on each day change the serif date fades in and the whole
  // screen warms ~2% toward the bronze accent, then settles — a quiet, tactile
  // acknowledgement that you've flipped a page through time (not speed-scrolled).
  const dateOpacity = useRef(new Animated.Value(1)).current;
  const warmth = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dateOpacity.setValue(0.35);
    warmth.setValue(0);
    Animated.parallel([
      Animated.timing(dateOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(warmth, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(warmth, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]),
    ]).start();
  }, [currentKey, dateOpacity, warmth]);

  const initialIndex = Math.max(0, days.indexOf(currentKey));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.overline}>{currentKey}</Text>
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.title, { opacity: dateOpacity }]}
          >
            {formatDayHeader(currentKey)}
          </Animated.Text>
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

      {/* Imperceptible warm wash on day change — pointer-transparent. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.warmWash,
          { opacity: warmth.interpolate({ inputRange: [0, 1], outputRange: [0, 0.03] }) },
        ]}
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerText: { flex: 1 },
  // Same editorial voice as ScreenHeader: bronze mono overline, serif title.
  overline: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: type.overline,
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.dayHeader,
    letterSpacing: 0.3,
  },
  calBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calGlyph: { fontSize: 20 },
  pager: { flex: 1 },
  pageHolder: { flex: 1 },
  warmWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
  },
});
