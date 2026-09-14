import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JarvisCore, type CoreState } from "../jarvis/core";
import { Copy } from "../ui/primitives";
import { theme } from "../../theme/tokens";

/** Shown before the workspace exists, so it carries identity instead of a bare spinner. */
export function Boot({ children, state }: PropsWithChildren<{ state: CoreState }>) {
  return <SafeAreaView style={styles.safe}>
    <View style={styles.center}>
      <JarvisCore state={state} size={56} />
      <Copy variant="marker" style={styles.mark}>JARVIS</Copy>
      <View style={styles.body}>{children}</View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.space.md, padding: theme.space.xl },
  mark: { color: theme.colors.text, letterSpacing: 3 },
  body: { alignItems: "center", alignSelf: "stretch", gap: theme.space.md },
});
