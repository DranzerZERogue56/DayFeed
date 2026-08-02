import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { radialSlots } from '../lib/radialLayout';
import type { NoteAction } from './NoteActionsSheet';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  visible: boolean;
  /** Optional short line identifying what the actions apply to. */
  subtitle?: string;
  actions: NoteAction[];
  onClose: () => void;
}

type Side = 'left' | 'right';

/** How far the pills sit from their anchor's centre. */
const ARC_RADIUS = 108;
const ANCHOR_SIZE = 52;
const PILL_WIDTH = 104;
const PILL_HEIGHT = 40;
/** Anchors sit two thirds down the screen, within thumb reach. */
const ANCHOR_TOP_FRACTION = 2 / 3;

// Long-press action menu. Two anchors appear at the left and right screen
// edges; tapping either fans the same actions out in an arc around it, so the
// menu can be worked with whichever thumb is already on the screen. Takes the
// same props as NoteActionsSheet so call sites swap the component name alone.
export default function RadialActionsMenu({ visible, subtitle, actions, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [openSide, setOpenSide] = useState<Side | null>(null);
  const fan = useRef(new Animated.Value(0)).current;

  // Each long-press starts from the closed state rather than reopening on
  // whichever side was used last.
  useEffect(() => {
    if (!visible) setOpenSide(null);
  }, [visible]);

  useEffect(() => {
    if (openSide === null) {
      fan.setValue(0);
      return;
    }
    Animated.timing(fan, {
      toValue: 1,
      duration: reducedMotion ? 120 : 220,
      useNativeDriver: true,
    }).start();
  }, [openSide, reducedMotion, fan]);

  const runAndClose = (fn: () => void) => {
    onClose();
    fn();
  };

  const anchorTop = height * ANCHOR_TOP_FRACTION;
  const slots = openSide ? radialSlots(actions.length, openSide, ARC_RADIUS) : [];

  const renderAnchor = (side: Side) => (
    <Pressable
      style={({ pressed }) => [
        styles.anchor,
        side === 'left' ? { left: spacing.lg } : { right: spacing.lg },
        { top: anchorTop - ANCHOR_SIZE / 2 },
        openSide === side && styles.anchorOpen,
        pressed && styles.anchorPressed,
      ]}
      onPress={() => setOpenSide(side)}
      accessibilityRole="button"
      accessibilityLabel={`Show note actions on the ${side}`}
    >
      <Text style={styles.anchorGlyph}>{openSide === side ? '×' : '⋯'}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {!!subtitle && (
          <Text
            style={[
              styles.subtitle,
              { top: Math.max(spacing.xl, anchorTop - ARC_RADIUS - spacing.xl * 2) },
            ]}
          >
            {subtitle}
          </Text>
        )}

        {renderAnchor('left')}
        {renderAnchor('right')}

        {openSide &&
          actions.map((action, i) => {
            const slot = slots[i];
            // Anchor centre, which the pill grows out from.
            const originX =
              openSide === 'left' ? spacing.lg + ANCHOR_SIZE / 2 : width - spacing.lg - ANCHOR_SIZE / 2;

            // Reduced motion still fades in, but lands the pills in place
            // instead of sweeping them along the arc.
            const travel = (to: number) =>
              reducedMotion
                ? to
                : fan.interpolate({ inputRange: [0, 1], outputRange: [0, to] });

            return (
              <Animated.View
                key={action.label}
                style={[
                  styles.pillWrap,
                  {
                    left: originX,
                    top: anchorTop,
                    opacity: fan,
                    transform: [
                      { translateX: travel(slot.x) },
                      { translateY: travel(slot.y) },
                    ],
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
                  onPress={() => runAndClose(action.onPress)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text style={[styles.pillText, action.danger && styles.danger]}>
                    {action.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    subtitle: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      textAlign: 'center',
      fontFamily: fonts.body,
      color: colors.text,
      fontSize: type.timestamp,
    },
    anchor: {
      position: 'absolute',
      width: ANCHOR_SIZE,
      height: ANCHOR_SIZE,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    anchorOpen: { backgroundColor: colors.accentTint },
    anchorPressed: { backgroundColor: colors.surfaceAlt },
    anchorGlyph: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
    },
    // Fixed size pulled back by half, so the pill's centre — not its corner —
    // lands on the arc. A zero-size wrapper would leave the pill overflowing
    // its parent, which Android clips.
    pillWrap: {
      position: 'absolute',
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      marginLeft: -PILL_WIDTH / 2,
      marginTop: -PILL_HEIGHT / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pill: {
      maxWidth: PILL_WIDTH,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    pillPressed: { backgroundColor: colors.surfaceAlt },
    pillText: {
      fontFamily: fonts.body,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    danger: { color: colors.danger },
  });
