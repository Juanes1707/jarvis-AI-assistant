import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, Copy, Icon, Row } from "../ui/primitives";
import { theme } from "../../theme/tokens";

export function Screen({ children, title, back = false }: PropsWithChildren<{ title?: string; back?: boolean }>) {
  return <SafeAreaView edges={back ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {back && <Button label="Volver" icon="arrow-left" secondary onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />}
        {title && <Copy variant="title" accessibilityRole="header">{title}</Copy>}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Brand() {
  return <Row style={{ justifyContent: "space-between", paddingBottom: 8 }}>
    <Row><View style={styles.avatar}><Copy variant="label">JE</Copy></View><Copy variant="heading">JARVIS AI</Copy><View style={styles.dot} /></Row>
    <Icon name="robot-outline" />
  </Row>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingBottom: 32, gap: 24 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#37546a", backgroundColor: theme.colors.elevated, alignItems: "center", justifyContent: "center" },
  dot: { width: 6, height: 6, backgroundColor: theme.colors.accent, borderRadius: 3 },
});
