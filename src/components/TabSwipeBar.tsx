import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { spacing, type ColorPalette } from '../theme';
import { useStyles } from '../hooks/ThemeContext';

const SWIPE_THRESHOLD = 36;
const DOT_SIZE = 6;
const DOT_SIZE_ACTIVE = 18;

interface Props {
  /** 0-based position of the current page among the swipeable set. */
  activeIndex: number;
  count: number;
  onNavigate: (index: number) => void;
}

// A small strip above the tab bar: drag left/right to step between Feed,
// Flip, Flop and Fly without reaching down to the tab icons. The dots double
// as a position indicator — the active one stretches into a pill.
export default function TabSwipeBar({ activeIndex, count, onNavigate }: Props) {
  const styles = useStyles(makeStyles);
  // PanResponder captures the gesture once at mount; read the live index
  // through a ref so onPanResponderRelease always sees the current page.
  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD && indexRef.current < count - 1) {
          onNavigate(indexRef.current + 1);
        } else if (gesture.dx >= SWIPE_THRESHOLD && indexRef.current > 0) {
          onNavigate(indexRef.current - 1);
        }
      },
    }),
  ).current;

  return (
    <View
      style={styles.wrap}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Switch between Feed, Flip, Flop and Fly"
      accessibilityValue={{ min: 0, max: count - 1, now: activeIndex }}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && activeIndex < count - 1) {
          onNavigate(activeIndex + 1);
        } else if (e.nativeEvent.actionName === 'decrement' && activeIndex > 0) {
          onNavigate(activeIndex - 1);
        }
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    >
      <View style={styles.track}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: colors.divider,
    },
    dotActive: {
      width: DOT_SIZE_ACTIVE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: colors.accent,
    },
  });
