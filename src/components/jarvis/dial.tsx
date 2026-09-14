import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Copy } from "../ui/primitives";
import { theme } from "../../theme/tokens";
import type { CoreState } from "./core";

const OUTER_TICKS = 48;
const INNER_TICKS = 24;

/** Radial tick ring. Built from plain Views so the project stays free of an SVG dependency. */
function TickRing({ count, radius, length, width, color, bright }: { count: number; radius: number; length: number; width: number; color: string; bright: string }) {
  const ticks = useMemo(() => Array.from({ length: count }, (_, index) => ({
    angle: (index * 360) / count,
    major: index % 6 === 0,
  })), [count]);
  return <>{ticks.map(tick => <View key={tick.angle} pointerEvents="none" style={[
    styles.tick,
    {
      width, height: tick.major ? length * 1.6 : length,
      marginLeft: -width / 2, marginTop: -(tick.major ? length * 1.6 : length) / 2,
      backgroundColor: tick.major ? bright : color,
      opacity: tick.major ? 0.9 : 0.4,
      transform: [{ rotate: `${tick.angle}deg` }, { translateY: -radius }],
    },
  ]} />)}</>;
}

/**
 * The instrument face. This is the product's hero object: a lit HUD gauge whose arcs move only
 * while JARVIS is genuinely working. Every state maps to real application state (DESIGN_SYNC §22).
 */
export function JarvisDial({ state, size = 220, label = "J.A.R.V.I.S." }: { state: CoreState; size?: number; label?: string }) {
  const sweep = useSharedValue(0);
  const counter = useSharedValue(0);
  const bloom = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const still = reducedMotion || state === "offline";
  const offline = state === "offline";

  const spinMs = state === "thinking" ? 1400 : state === "listening" ? 2600 : state === "speaking" ? 2000 : 9000;

  useEffect(() => {
    if (still) { cancelAnimation(sweep); cancelAnimation(counter); return; }
    sweep.value = 0;
    counter.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: spinMs, easing: Easing.linear }), -1, false);
    counter.value = withRepeat(withTiming(1, { duration: spinMs * 1.9, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(sweep); cancelAnimation(counter); };
  }, [still, spinMs, sweep, counter]);

  useEffect(() => {
    if (still) { cancelAnimation(bloom); bloom.value = withTiming(0, { duration: theme.motion.base }); return; }
    const period = state === "speaking" ? 620 : state === "listening" ? 1100 : theme.motion.breath;
    bloom.value = withRepeat(withSequence(
      withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: period / 2, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(bloom);
  }, [still, state, bloom]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sweep.value * 360}deg` }] }));
  const counterStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-counter.value * 360}deg` }] }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + bloom.value * 0.55,
    transform: [{ scale: 0.94 + bloom.value * 0.1 }],
  }));

  const ring = offline ? theme.colors.border : theme.colors.accent;
  const ringBright = offline ? theme.colors.dim : theme.colors.accent;
  const live = offline ? theme.colors.dim : theme.colors.energy;

  return <View accessible={false} style={[styles.frame, { width: size, height: size }]}>
    {offline ? null : <>
      <Animated.View style={[styles.circle, { width: size * 1.08, height: size * 1.08, borderRadius: size * 0.54, backgroundColor: theme.glow.energyFaint }, bloomStyle]} />
      <Animated.View style={[styles.circle, { width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36, backgroundColor: theme.glow.accentFaint }, bloomStyle]} />
    </>}

    <TickRing count={OUTER_TICKS} radius={size * 0.455} length={size * 0.042} width={1.5} color={ring} bright={ringBright} />

    <View style={[styles.circle, { width: size * 0.80, height: size * 0.80, borderRadius: size * 0.40, borderWidth: 1, borderColor: theme.colors.border }]} />

    <Animated.View style={[styles.circle, { width: size * 0.84, height: size * 0.84, borderRadius: size * 0.42, borderWidth: 2, borderColor: "transparent", borderTopColor: live }, sweepStyle]} />
    <Animated.View style={[styles.circle, { width: size * 0.66, height: size * 0.66, borderRadius: size * 0.33, borderWidth: 1, borderColor: "transparent", borderRightColor: ring, borderTopColor: ring }, counterStyle]} />

    <TickRing count={INNER_TICKS} radius={size * 0.315} length={size * 0.028} width={1} color={ring} bright={ringBright} />

    <View style={[styles.core, { width: size * 0.48, height: size * 0.48, borderRadius: size * 0.24, borderColor: offline ? theme.colors.border : theme.colors.accentSoft }]}>
      <Copy variant="system" numberOfLines={1} style={[styles.label, { color: offline ? theme.colors.dim : theme.colors.accent, fontSize: Math.max(9, size * 0.044) }]}>{label}</Copy>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
  tick: { position: "absolute", left: "50%", top: "50%", borderRadius: 1 },
  circle: { position: "absolute" },
  core: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.accentWash, borderWidth: 1 },
  label: { letterSpacing: 1.1, textAlign: "center" },
});
