import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  BOOT_BG,
  FINAL_COLOR,
  HOLD_MS,
  MIN_SPINNER_MS,
  RING_MS,
  SPLASH_COLORS,
  SPLIT_MS,
  coverRadius,
  ringDelay,
} from '../lib/bootSplash';

interface Props {
  /** True once the database is open and the app tree can be mounted behind us. */
  ready: boolean;
  /** Called when the cover has finished opening and this overlay can unmount. */
  onDone: () => void;
}

const SPINNER_SIZE = 46;
const SPINNER_BORDER = 3;

// The launch screen: a loading ring on paper, then DayFeed's bronzes splashing
// out from it to fill the screen, then the dark cover opening onto the app.
//
// It sits *over* the app rather than in front of it, so the app is already
// mounted and laid out behind the cover by the time it opens.
export default function BootSplash({ ready, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const spin = useRef(new Animated.Value(0)).current;
  // One value per colour, plus one driving the cover's two halves.
  const rings = useRef(SPLASH_COLORS.map(() => new Animated.Value(0))).current;
  const open = useRef(new Animated.Value(0)).current;
  const spinnerFade = useRef(new Animated.Value(1)).current;

  const mountedAt = useRef(Date.now());
  const started = useRef(false);

  const radius = coverRadius(width, height);

  // Hide the native splash only once we have actually painted. Hiding it on a
  // timer instead would expose the bare window for a frame.
  const onLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Already hidden, or the module is unavailable — nothing to recover from.
    });
  }, []);

  // The loading ring spins for as long as it is visible.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    // Reduced motion: the ring did its job, go straight to the app.
    if (reduceMotion) {
      onDone();
      return;
    }

    // Hold the ring long enough to read as a loading state on a warm start.
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_SPINNER_MS - elapsed);

    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(spinnerFade, {
            toValue: 0,
            duration: RING_MS / 2,
            useNativeDriver: true,
          }),
          ...rings.map((value, i) =>
            Animated.timing(value, {
              toValue: 1,
              delay: ringDelay(i),
              duration: RING_MS,
              // Fast out of the gate, easing into the edge — a splash, not a wipe.
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ]),
        Animated.delay(HOLD_MS),
        Animated.timing(open, {
          toValue: 1,
          duration: SPLIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    }, wait);

    return () => clearTimeout(timer);
  }, [ready, reduceMotion, onDone, rings, open, spinnerFade]);

  const spinDeg = useMemo(
    () => spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    [spin],
  );

  const halfWidth = width / 2;

  // Everything below the cover has to disappear the instant the cover appears,
  // or the halves would slide apart to reveal the paper background and the last
  // ring rather than the app. Opacity (not backgroundColor) so it stays on the
  // native driver; the 0.001 step makes the handover a cut, not a cross-fade.
  const beneathCover = open.interpolate({
    inputRange: [0, 0.001, 1],
    outputRange: [1, 0, 0],
  });
  const coverOpacity = open.interpolate({
    inputRange: [0, 0.001, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View
      style={styles.fill}
      onLayout={onLayout}
      // The overlay is decorative; never let it swallow taps meant for the app.
      pointerEvents="none"
    >
      {/* The paper the ring sits on, matching the native splash exactly. */}
      <Animated.View
        style={[styles.fill, { backgroundColor: BOOT_BG, opacity: beneathCover }]}
      />

      {/* The colours, each a circle big enough to cover the screen when grown. */}
      {SPLASH_COLORS.map((color, i) => (
        <Animated.View
          key={color}
          style={[
            styles.ring,
            {
              opacity: beneathCover,
              backgroundColor: color,
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              left: width / 2 - radius,
              top: height / 2 - radius,
              transform: [{ scale: rings[i] }],
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.center, { opacity: spinnerFade }]}>
        <Animated.View
          style={[
            styles.spinner,
            {
              borderColor: SPLASH_COLORS[2],
              // One transparent edge is what makes a spinning ring read as
              // spinning at all — a full ring looks static however fast it turns.
              borderTopColor: 'transparent',
              transform: [{ rotate: spinDeg }],
            },
          ]}
        />
      </Animated.View>

      {/* The cover: two halves that sweep apart to reveal the app beneath. */}
      <Animated.View
        style={[
          styles.coverHalf,
          {
            width: halfWidth,
            left: 0,
            backgroundColor: FINAL_COLOR,
            opacity: coverOpacity,
            transform: [
              {
                translateX: open.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -halfWidth],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.coverHalf,
          {
            width: halfWidth,
            left: halfWidth,
            backgroundColor: FINAL_COLOR,
            opacity: coverOpacity,
            transform: [
              {
                translateX: open.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, halfWidth],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  ring: { position: 'absolute' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: SPINNER_BORDER,
  },
  coverHalf: { position: 'absolute', top: 0, bottom: 0 },
});
