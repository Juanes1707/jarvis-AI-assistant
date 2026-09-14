import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Copy, Icon } from "../ui/primitives";
import { theme } from "../../theme/tokens";

export function Screen({ children, title, subtitle, back = false, action }: PropsWithChildren<{ title?: string; subtitle?: string; back?: boolean; action?: ReactNode }>) {
  return <SafeAreaView edges={back ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {back || action ? <View style={styles.bar}>
          {back ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" hitSlop={12} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={styles.back}>
            <Icon name="chevron-left" size={22} color={theme.colors.muted} />
          </Pressable> : <View />}
          {action}
        </View> : null}
        {title ? <View style={styles.heading}>
          <Copy variant="title" accessibilityRole="header">{title}</Copy>
          {subtitle ? <Copy variant="caption" muted>{subtitle}</Copy> : null}
        </View> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.space.md, paddingTop: theme.space.sm, paddingBottom: theme.space.xxl, gap: theme.space.lg },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: theme.touchTarget },
  back: { width: theme.touchTarget, height: theme.touchTarget, marginLeft: -theme.space.ms, alignItems: "flex-start", justifyContent: "center" },
  heading: { gap: theme.space.xs },
});
