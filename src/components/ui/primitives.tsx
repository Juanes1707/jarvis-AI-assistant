import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle, type StyleProp, type ColorValue } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../theme/tokens";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({ name, color = theme.colors.accent, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function Copy({ variant = "body", muted, style, ...props }: TextProps & { variant?: "body" | "title" | "heading" | "label" | "mono"; muted?: boolean }) {
  return <Text {...props} style={[styles.copy, styles[variant], muted && { color: theme.colors.muted }, style]} />;
}
export function Card({ children, tone = "default", style }: PropsWithChildren<{ tone?: "default" | "accent" | "danger"; style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, tone === "accent" && styles.accentCard, tone === "danger" && styles.dangerCard, style]}>{children}</View>;
}
export function Row({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.row, style]}>{children}</View>;
}
export function Badge({ children, color = theme.colors.accent }: PropsWithChildren<{ color?: string }>) {
  return <View style={[styles.badge, { borderColor: color + "40" }]}><Copy variant="label" style={{ color }}>{children}</Copy></View>;
}
export function Button({ label, onPress, icon, disabled, loading, secondary = false }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; loading?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
    {loading ? <ActivityIndicator color={theme.colors.accent} /> : icon ? <Icon name={icon} color={secondary ? theme.colors.accent : "#ffffff"} size={20} /> : null}
    <Copy style={[styles.buttonLabel, secondary && { color: theme.colors.accent }]}>{label}</Copy>
  </Pressable>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  const percent = Math.min(100, Math.max(0, value));
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>;
}
export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ gap: 4 }}><Copy variant="heading" accessibilityRole="header">{title}</Copy>{subtitle ? <Copy muted>{subtitle}</Copy> : null}</View>;
}
export const styles = StyleSheet.create({
  copy: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 14, lineHeight: 22 },
  body: {},
  title: { fontFamily: theme.fonts.heading, fontSize: 28, lineHeight: 35 },
  heading: { fontFamily: theme.fonts.heading, fontSize: 20, lineHeight: 27 },
  label: { fontFamily: theme.fonts.heading, fontSize: 12, lineHeight: 18, letterSpacing: 1 },
  mono: { fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.card, padding: 16, gap: 16 },
  accentCard: { backgroundColor: "#111b27", borderColor: "#244257" },
  dangerCard: { backgroundColor: "#1b1b25", borderColor: "#50313e" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#0e1a25" },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: "#0369a1", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  secondaryButton: { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border, borderWidth: 1 },
  buttonLabel: { color: "#ffffff", fontFamily: theme.fonts.medium, textAlign: "center", flexShrink: 1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  track: { height: 6, borderRadius: 6, overflow: "hidden", backgroundColor: "#2b3342" },
  fill: { height: "100%", borderRadius: 6, backgroundColor: theme.colors.accent },
});
