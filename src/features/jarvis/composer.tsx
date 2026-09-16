import type { RefObject } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Copy, OrbButton, Rail, Row } from "../../components/ui/primitives";
import { JarvisCore } from "../../components/jarvis/core";
import { theme } from "../../theme/tokens";

/** One value instead of five booleans: the composer is only ever in one of these states. */
export type ComposerState = "idle" | "listening" | "thinking" | "saving" | "speaking";

const LISTENING_HINT = "Habla con naturalidad. Al terminar verás la transcripción antes de que JARVIS actúe.";

/**
 * The state strip. It reserves its height so that starting to listen never pushes the
 * conversation, and it is the one place recording, speaking and errors are announced.
 */
function StateStrip({ state, notice }: { state: ComposerState; notice: string }) {
  if (notice) {
    return <Row style={styles.strip}>
      <Rail tone="warning" />
      <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.warning}>{notice}</Copy>
    </Row>;
  }
  if (state === "listening") {
    return <Row style={styles.strip}>
      <JarvisCore state="listening" size={28} />
      <View style={styles.grow}>
        <Copy variant="system" accessibilityLiveRegion="assertive" style={styles.live}>ESCUCHANDO</Copy>
        <Copy variant="caption" muted>{LISTENING_HINT}</Copy>
      </View>
    </Row>;
  }
  if (state === "speaking") {
    return <Row style={styles.strip}>
      <JarvisCore state="speaking" size={28} />
      <Copy variant="system" accessibilityLiveRegion="polite" style={[styles.grow, styles.live]}>JARVIS HABLANDO</Copy>
    </Row>;
  }
  return <View style={styles.stripEmpty} />;
}

export function Composer({ state, draft, notice, inputRef, onDraftChange, onSend, onListen, onStopSpeaking }: {
  state: ComposerState;
  draft: string;
  notice: string;
  inputRef?: RefObject<TextInput | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onListen: () => void;
  onStopSpeaking: () => void;
}) {
  const working = state !== "idle";
  const canSend = draft.trim().length > 0 && !working;
  return <View style={styles.composer}>
    <StateStrip state={state} notice={notice} />
    <Row style={styles.slot}>
      <Copy variant="system" style={styles.slotLabel}>ASK</Copy>
      <TextInput ref={inputRef} accessibilityLabel="Mensaje para JARVIS" value={draft} onChangeText={onDraftChange}
        placeholder="«organiza mi día»" placeholderTextColor={theme.colors.dim}
        multiline maxLength={1000} editable={state === "idle" || state === "speaking"} style={styles.slotInput} />
    </Row>
    <Row style={styles.actions}>
      <OrbButton label={state === "listening" ? "Escuchando…" : "Hablar con JARVIS"} icon="microphone"
        tone={state === "listening" ? "accent" : "energy"} disabled={working} onPress={onListen} size={56} />
      {state === "speaking" ? <OrbButton label="Detener voz" icon="stop" tone="muted" onPress={onStopSpeaking} /> : null}
      <View style={styles.grow} />
      <OrbButton label="Enviar" icon="arrow-up" tone={canSend ? "accent" : "muted"} disabled={!canSend} onPress={onSend} />
    </Row>
  </View>;
}

const styles = StyleSheet.create({
  composer: { padding: theme.space.md, gap: theme.space.ms, borderTopWidth: 1, borderTopColor: theme.colors.edge, backgroundColor: theme.colors.surface },
  strip: { alignItems: "center", gap: theme.space.ms, minHeight: 40 },
  stripEmpty: { height: theme.space.hair },
  live: { color: theme.colors.energy },
  warning: { color: theme.colors.warning, flex: 1 },
  slot: {
    minHeight: theme.touchTarget, paddingHorizontal: theme.space.ms, gap: theme.space.ms,
    backgroundColor: theme.colors.background, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  slotLabel: { color: theme.colors.dim },
  slotInput: {
    flex: 1, minHeight: theme.touchTarget, maxHeight: 120, color: theme.colors.text,
    fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 22, paddingVertical: theme.space.ms,
  },
  actions: { gap: theme.space.sm },
  grow: { flex: 1 },
});
