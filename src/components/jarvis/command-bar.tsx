import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Copy, Icon, Row } from "../ui/primitives";
import { theme } from "../../theme/tokens";

const STARTERS = ["¿Qué estudio hoy?", "Organiza mi día"];

export function CommandBar() {
  const [input, setInput] = useState("");
  const ask = (question: string) => {
    const text = question.trim();
    if (text) router.navigate({ pathname: "/jarvis", params: { question: text, request: String(Date.now()) } });
  };
  return <View style={styles.wrap}>
    <Row style={styles.slot}>
      <Icon name="chevron-right" size={18} color={theme.colors.accent} />
      <TextInput value={input} onChangeText={setInput} placeholder="Pregúntale a JARVIS" placeholderTextColor={theme.colors.dim}
        accessibilityLabel="Preguntar a JARVIS" returnKeyType="send" onSubmitEditing={() => ask(input)} style={styles.input} />
      {input.trim() ? <Pressable accessibilityRole="button" accessibilityLabel="Consultar JARVIS" hitSlop={10} onPress={() => ask(input)} style={styles.send}>
        <Icon name="arrow-up" size={18} color={theme.colors.text} />
      </Pressable> : null}
    </Row>
    <Row style={styles.starters}>
      {STARTERS.map(prompt => <Pressable key={prompt} accessibilityRole="button" accessibilityLabel={prompt} onPress={() => ask(prompt)} style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}>
        <Copy variant="caption" muted>{prompt}</Copy>
      </Pressable>)}
    </Row>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.sm },
  slot: {
    minHeight: theme.touchTarget, paddingHorizontal: theme.space.ms, gap: theme.space.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  input: { flex: 1, minHeight: theme.touchTarget, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 15 },
  send: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.hairline, backgroundColor: theme.colors.elevated },
  starters: { flexWrap: "wrap", gap: theme.space.sm },
  chip: { minHeight: 34, justifyContent: "center", paddingHorizontal: theme.space.ms, borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.border },
  pressed: { opacity: 0.6 },
});
