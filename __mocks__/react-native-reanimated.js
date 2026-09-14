// Reanimated 4 initializes react-native-worklets at import time, which needs a
// TurboModule that does not exist under Jest. The package's own mock re-enters that
// same path, so the animation surface JARVIS actually uses is shimmed here instead.
// Animations run for real on device; tests assert rendered structure and state text.
const React = require("react");
const { View, Text, Image, ScrollView } = require("react-native");

const passthrough = (toValue) => toValue;
const easingFn = () => passthrough;

function useSharedValue(initial) {
  const ref = React.useRef({
    value: initial,
    get() { return this.value; },
    set(next) { this.value = typeof next === "function" ? next(this.value) : next; },
  });
  return ref.current;
}

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: (Component) => Component,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue,
  useDerivedValue: (factory) => ({ value: factory(), get() { return this.value; } }),
  useAnimatedStyle: (factory) => factory(),
  useAnimatedProps: (factory) => factory(),
  useAnimatedRef: () => React.createRef(),
  useReducedMotion: () => false,
  useAnimatedReaction: () => {},
  withTiming: passthrough,
  withSpring: passthrough,
  withDelay: (_delay, animation) => animation,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (value) => value,
  interpolateColor: (_value, _input, output) => output[0],
  Easing: {
    linear: passthrough,
    ease: passthrough,
    quad: passthrough,
    cubic: passthrough,
    bezier: easingFn,
    in: easingFn,
    out: easingFn,
    inOut: easingFn,
  },
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
};
