import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { JarvisCore, type CoreState } from "../jarvis/core";
import { Copy } from "../ui/primitives";
import { theme } from "../../theme/tokens";

/** Identity strip: the core carries state, the wordmark carries the product. */
export function SystemBar({ state, right }: { state: CoreState; right?: ReactNode }) {
  return <View style={styles.bar}>
    <JarvisCore state={state} size={26} />
    <Copy variant="marker" style={styles.mark}>JARVIS</Copy>
    <View style={styles.spacer} />
    {right}
  </View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: theme.space.sm, minHeight: 32 },
  mark: { color: theme.colors.text, letterSpacing: 2.5 },
  spacer: { flex: 1 },
});
