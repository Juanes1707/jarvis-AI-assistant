import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { theme } from "../../theme/tokens";

/** Every state here maps to real application state. Nothing animates to look busy. */
export type CoreState = "idle" | "listening" | "thinking" | "speaking" | "offline";

const BREATH: Record<CoreState, number> = {
  idle: theme.motion.breath, listening: 1100, thinking: 1600, speaking: 620, offline: 0,
};

/**
 * Compact presence indicator for the system bar and the tab dock. The shell holds still;
 * only the light inside it moves. Use JarvisDial when the assistant itself is the subject.
 */
export function JarvisCore({ state, size = 44 }: { state: CoreState; size?: number }) {
  const breath = useSharedValue(0);
  const ring = useSharedValue(0);
  const spin = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const still = reducedMotion || state === "offline";
  const offline = state === "offline";

  useEffect(() => {
    if (still) {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: theme.motion.base });
      return;
    }
    const half = BREATH[state] / 2;
    breath.value = withRepeat(withSequence(
      withTiming(1, { duration: half, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: half, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(breath);
  }, [state, still, breath]);

  useEffect(() => {
    if (still || state !== "listening") {
      cancelAnimation(ring);
      ring.value = 0;
      return;
    }
    ring.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(ring);
  }, [state, still, ring]);

  useEffect(() => {
    if (still || state !== "thinking") {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [state, still, spin]);

  const irisStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + breath.value * 0.4,
    transform: [{ scale: 0.88 + breath.value * 0.22 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breath.value * 0.55,
    transform: [{ scale: 0.9 + breath.value * 0.25 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.55,
    transform: [{ scale: 1 + ring.value * 1.1 }],
  }));
  const arcStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  const iris = Math.round(size * 0.3);
  const halo = Math.round(size * 0.66);
  return <View accessible={false} style={[styles.frame, { width: size, height: size }]}>
    <Animated.View style={[styles.layer, { borderRadius: size / 2, borderWidth: 1, borderColor: theme.colors.accent }, ringStyle]} />
    <View style={[styles.bezel, { borderRadius: size / 2, borderTopColor: offline ? theme.colors.border : theme.colors.accentSoft }]}>
      <Animated.View style={[styles.layer, { borderRadius: size / 2, borderWidth: 1, borderColor: "transparent", borderTopColor: theme.colors.accent }, arcStyle]} />
      {offline ? null : <Animated.View style={[{ position: "absolute", width: halo, height: halo, borderRadius: halo / 2, backgroundColor: theme.glow.energy }, haloStyle]} />}
      <Animated.View style={[{ width: iris, height: iris, borderRadius: iris / 2, backgroundColor: offline ? theme.colors.dim : theme.colors.energy }, irisStyle]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  bezel: {
    flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface,
    borderWidth: 1, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
});
