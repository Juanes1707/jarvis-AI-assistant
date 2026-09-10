import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Icon, Row } from "../ui/primitives";
import { theme } from "../../theme/tokens";
export function CommandBar() {
  const [input, setInput] = useState("");
  const ask = (question: string) => {
    if (question.trim()) router.navigate({ pathname: "/jarvis", params: { question: question.trim(), request: String(Date.now()) } });
  };
  return <Card>
    <Row><Icon name="waveform" /><TextInput value={input} onChangeText={setInput} placeholder="Pregúntale a JARVIS…" placeholderTextColor={theme.colors.muted} accessibilityLabel="Preguntar a JARVIS" returnKeyType="send" onSubmitEditing={() => ask(input)} style={styles.input} /></Row>
    {input.trim() ? <Button label="Consultar JARVIS" icon="arrow-up" onPress={() => ask(input)} /> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.prompts}><Button label="¿Qué estudio hoy?" secondary onPress={() => ask("¿Qué debería estudiar hoy?")} /><Button label="Organiza mi día" secondary onPress={() => ask("Organiza mi día")} /></View>
    </ScrollView>
  </Card>;
}
const styles = StyleSheet.create({
  input: { flex: 1, minHeight: 48, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 16 },
  prompts: { flexDirection: "row", gap: 8 },
});
