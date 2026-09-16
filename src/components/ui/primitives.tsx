import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle, type StyleProp, type ColorValue } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { theme } from "../../theme/tokens";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({ name, color = theme.colors.muted, size = 20 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}

type CopyVariant = "body" | "lead" | "section" | "title" | "caption" | "system" | "marker" | "metric" | "metricSmall";
export function Copy({ variant = "body", muted, style, ...props }: TextProps & { variant?: CopyVariant; muted?: boolean }) {
  return <Text {...props} style={[text.base, text[variant], muted ? text.muted : null, style]} />;
}

type Tone = "accent" | "energy" | "danger" | "warning" | "muted";
const TONE: Record<Tone, string> = {
  accent: theme.colors.accent, energy: theme.colors.energy, danger: theme.colors.danger,
  warning: theme.colors.warning, muted: theme.colors.border,
};

/** A lit panel: cyan top bevel, darker seam on the remaining sides. */
export function Plate({ children, tone = "default", style }: PropsWithChildren<{ tone?: "default" | "live" | "alert"; style?: StyleProp<ViewStyle> }>) {
  return <View style={[surface.plate, tone === "live" ? surface.live : null, tone === "alert" ? surface.alert : null, style]}>{children}</View>;
}

/** The cut between two sections. */
export function Seam({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[surface.seam, style]} />;
}

/** Light escaping a seam. Marks the one thing that matters, never decoration. */
export function Rail({ tone = "accent" }: { tone?: Tone }) {
  return <View style={[surface.rail, { backgroundColor: TONE[tone] }]} />;
}

/** Category marker. The reference colour-codes every node by kind; this is that device. */
export function Dot({ color, size = 8, glow = false }: { color: string; size?: number; glow?: boolean }) {
  return <View style={[surface.dotFrame, { width: size * 2, height: size * 2 }]}>
    {glow ? <View style={{ position: "absolute", width: size * 2, height: size * 2, borderRadius: size, backgroundColor: color, opacity: 0.18 }} /> : null}
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  </View>;
}

export function Row({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[surface.row, style]}>{children}</View>;
}

/** Section header: system marker followed by the seam that runs to the edge. */
export function SectionMarker({ label, trailing }: { label: string; trailing?: ReactNode }) {
  return <Row style={surface.marker}>
    <Copy variant="marker" accessibilityRole="header">{label}</Copy>
    <View style={surface.markerRule} />
    {trailing}
  </Row>;
}

/** Cut, marker, content. Holds the vertical rhythm steady across every screen. */
export function Section({ label, trailing, children }: PropsWithChildren<{ label: string; trailing?: ReactNode }>) {
  return <View style={surface.section}>
    <Seam />
    <SectionMarker label={label} trailing={trailing} />
    {children}
  </View>;
}

/** Label left, value right — reads as a column when stacked. */
export function DataRow({ label, value, tone = "default", note, dot }: { label: string; value: string; tone?: "default" | "accent" | "danger" | "muted"; note?: string; dot?: string }) {
  return <Row style={surface.dataRow}>
    {dot ? <Dot color={dot} /> : null}
    <View style={surface.grow}>
      <Copy variant="body">{label}</Copy>
      {note ? <Copy variant="caption" muted>{note}</Copy> : null}
    </View>
    <Copy variant="metricSmall" style={tone === "accent" ? text.accent : tone === "danger" ? text.danger : tone === "muted" ? text.muted : null}>{value}</Copy>
  </Row>;
}

export function Badge({ children, color = theme.colors.muted }: PropsWithChildren<{ color?: string }>) {
  return <View style={[surface.badge, { borderColor: color }]}><Copy variant="system" style={{ color }}>{children}</Copy></View>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ label, onPress, icon, disabled, loading, variant = "primary" }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; loading?: boolean; variant?: ButtonVariant }) {
  const inert = disabled || loading;
  const tint = variant === "primary" ? theme.colors.text : variant === "danger" ? theme.colors.danger : theme.colors.muted;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: inert, busy: loading }} disabled={inert} onPress={onPress}
    style={({ pressed }) => [control.button, control[variant], inert ? control.inert : null, pressed ? control.pressed : null]}>
    {loading ? <ActivityIndicator color={theme.colors.accent} size="small" /> : icon ? <Icon name={icon} color={tint} size={18} /> : null}
    <Copy variant={variant === "ghost" ? "caption" : "body"} style={[control.label, { color: tint }]}>{label}</Copy>
  </Pressable>;
}

/** Circular control, as used for the reference's microphone and tool row. */
export function OrbButton({ label, icon, onPress, disabled, tone = "muted", size = 48 }: { label: string; icon: IconName; onPress: () => void; disabled?: boolean; tone?: "muted" | "energy" | "accent"; size?: number }) {
  const color = tone === "muted" ? theme.colors.muted : tone === "energy" ? theme.colors.energy : theme.colors.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [control.orb, { width: size, height: size, borderRadius: size / 2, borderColor: tone === "muted" ? theme.colors.border : color }, disabled ? control.inert : null, pressed ? control.pressed : null]}>
    {tone === "muted" ? null : <View style={[control.orbGlow, { borderRadius: size / 2, backgroundColor: tone === "energy" ? theme.glow.energy : theme.glow.accent }]} />}
    <Icon name={icon} color={color} size={Math.round(size * 0.42)} />
  </Pressable>;
}

/**
 * Mode selector. Reuses the lit-edge motif of the tab dock rather than importing a foreign
 * pill-shaped control, so switching modes reads like switching instruments on the same panel.
 */
export function Segmented<Value extends string>({ label, value, options, onChange, disabled }: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string; icon?: IconName }[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={control.segmented}>
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected, disabled }}
        disabled={disabled} onPress={() => onChange(option.value)}
        style={({ pressed }) => [control.segment, pressed ? control.pressed : null, disabled ? control.inert : null]}>
        {option.icon ? <Icon name={option.icon} size={16} color={selected ? theme.colors.text : theme.colors.dim} /> : null}
        <Copy variant="caption" style={selected ? control.segmentOn : control.segmentOff}>{option.label}</Copy>
        <View style={[control.segmentEdge, selected ? control.segmentEdgeOn : null]} />
      </Pressable>;
    })}
  </View>;
}

/** Selectable row. Replaces stacks of buttons used as a radio group. */
export function OptionRow({ label, note, selected, onPress, disabled }: { label: string; note?: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [control.option, pressed ? control.pressed : null, disabled ? control.inert : null]}>
    <View style={surface.grow}>
      <Copy variant="body" style={selected ? undefined : text.muted}>{label}</Copy>
      {note ? <Copy variant="caption" muted>{note}</Copy> : null}
    </View>
    <Icon name={selected ? "check-circle" : "circle-outline"} size={20} color={selected ? theme.colors.accent : theme.colors.dim} />
  </Pressable>;
}

/** Labelled input. Keeps every form field in the product on one border and one radius. */
export function Field({ label, hint, trailing, style, ...props }: TextInputProps & { label: string; hint?: string; trailing?: ReactNode }) {
  return <View style={control.field}>
    <Copy variant="marker">{label}</Copy>
    <Row style={control.fieldSlot}>
      <TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.dim} {...props} style={[control.fieldInput, style]} />
      {trailing}
    </Row>
    {hint ? <Copy variant="caption" muted>{hint}</Copy> : null}
  </View>;
}

/** Crimson is reserved for urgency; cyan for the metric JARVIS is actively pushing. */
export function Progress({ value, label, tone = "default" }: { value: number; label: string; tone?: "default" | "accent" | "danger" }) {
  const percent = Math.min(100, Math.max(0, value));
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }} style={control.track}>
    <View style={[control.fill, tone === "accent" ? control.fillAccent : tone === "danger" ? control.fillDanger : null, { width: `${percent}%` }]} />
  </View>;
}

const text = StyleSheet.create({
  base: { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 23 },
  body: {},
  lead: { fontSize: 18, lineHeight: 28 },
  section: { fontFamily: theme.fonts.medium, fontSize: 17, lineHeight: 24 },
  title: { fontFamily: theme.fonts.medium, fontSize: 22, lineHeight: 29 },
  caption: { fontSize: 13, lineHeight: 19 },
  system: { fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
  marker: { fontFamily: theme.fonts.mono, fontSize: 12, lineHeight: 18, letterSpacing: 1.6, color: theme.colors.dim },
  metric: { fontFamily: theme.fonts.display, fontSize: 34, lineHeight: 40 },
  metricSmall: { fontFamily: theme.fonts.display, fontSize: 20, lineHeight: 26 },
  muted: { color: theme.colors.muted },
  accent: { color: theme.colors.accent },
  danger: { color: theme.colors.danger },
});

const surface = StyleSheet.create({
  plate: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.plate, padding: theme.space.md, gap: theme.space.ms,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  // Only the top edge lights up. A fully tinted box would drown the rails that mark real focus.
  live: { backgroundColor: theme.colors.accentWash, borderTopColor: theme.colors.accent, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border },
  alert: { backgroundColor: theme.colors.dangerWash, borderTopColor: theme.colors.danger, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border },
  seam: { height: 1, backgroundColor: theme.colors.border },
  rail: { width: theme.space.hair, alignSelf: "stretch", borderRadius: theme.radius.hairline },
  dotFrame: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: theme.space.ms },
  marker: { gap: theme.space.ms },
  markerRule: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  section: { gap: theme.space.ms },
  dataRow: { minHeight: 44, gap: theme.space.ms },
  grow: { flex: 1 },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: theme.radius.control, paddingHorizontal: theme.space.sm, paddingVertical: theme.space.xs },
});

const control = StyleSheet.create({
  button: { minHeight: theme.touchTarget, borderRadius: theme.radius.control, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: theme.space.ms, paddingHorizontal: theme.space.md, gap: theme.space.sm, borderWidth: 1 },
  // The lit key: system light escapes along the bottom edge of the primary action.
  primary: { backgroundColor: theme.colors.elevated, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomWidth: 2, borderBottomColor: theme.colors.accent },
  secondary: { backgroundColor: "transparent", borderColor: theme.colors.border },
  ghost: { backgroundColor: "transparent", borderColor: "transparent", paddingHorizontal: theme.space.sm },
  danger: { backgroundColor: theme.colors.dangerWash, borderColor: theme.colors.danger },
  label: { fontFamily: theme.fonts.medium, textAlign: "center", flexShrink: 1 },
  inert: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  orb: { alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: theme.colors.surface },
  orbGlow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  segmented: { flexDirection: "row", gap: theme.space.lg },
  segment: { flexDirection: "row", alignItems: "center", gap: theme.space.sm, minHeight: theme.touchTarget, paddingBottom: theme.space.sm },
  segmentOn: { color: theme.colors.text },
  segmentOff: { color: theme.colors.dim },
  segmentEdge: { position: "absolute", left: 0, right: 0, bottom: 0, height: theme.space.hair, borderRadius: theme.radius.hairline, backgroundColor: "transparent" },
  segmentEdgeOn: { backgroundColor: theme.colors.accent },
  option: { flexDirection: "row", alignItems: "center", gap: theme.space.ms, minHeight: theme.touchTarget, paddingVertical: theme.space.sm },
  field: { gap: theme.space.sm },
  fieldSlot: {
    minHeight: theme.touchTarget, paddingRight: theme.space.sm, gap: theme.space.sm, borderRadius: theme.radius.control, backgroundColor: theme.colors.background,
    borderWidth: 1, borderTopColor: theme.colors.border, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  fieldInput: {
    flex: 1, minHeight: theme.touchTarget, maxHeight: 120, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 22,
    paddingHorizontal: theme.space.ms, paddingVertical: theme.space.ms,
  },
  track: { height: 3, overflow: "hidden", backgroundColor: theme.colors.border, borderRadius: theme.radius.hairline },
  fill: { height: "100%", backgroundColor: theme.colors.muted, borderRadius: theme.radius.hairline },
  fillAccent: { backgroundColor: theme.colors.accent },
  fillDanger: { backgroundColor: theme.colors.danger },
});
