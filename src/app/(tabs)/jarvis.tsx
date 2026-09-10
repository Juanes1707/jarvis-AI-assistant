import { useState } from "react";
import { TextInput, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Icon, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { resolveDashboardCommand } from "../../features/dashboard/command";
import { theme } from "../../theme/tokens";

export default function JarvisScreen() {
  const params = useLocalSearchParams<{ question?: string; request?: string }>();
  return <JarvisConversation key={params.request ?? params.question ?? "initial"} initialQuestion={typeof params.question === "string" ? params.question : ""} />;
}
function JarvisConversation({ initialQuestion }: { initialQuestion: string }) {
  const { dashboard } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState(initialQuestion);
  const ask = (value: string) => { if (value.trim()) { setQuestion(value.trim()); setDraft(""); } };
  const response = question ? resolveDashboardCommand(question, dashboard.context) : "";
  return <Screen title="JARVIS">
    <View style={{ alignItems: "center", gap: 16, paddingVertical: 16 }}><View style={styles.orb}><Icon name="robot-outline" size={48} /></View><Copy variant="heading">Un poco de claridad para tu día.</Copy><Badge>ASISTENTE LOCAL · POR REGLAS</Badge></View>
    <Copy muted>Consulta tus tareas, agenda, materias y presupuesto de demostración.</Copy>
    <Row style={{ flexWrap: "wrap" }}>{["Organiza mi día", "¿Qué estudio hoy?", "Mis finanzas", "Tareas pendientes"].map(prompt => <Button key={prompt} label={prompt} secondary onPress={() => ask(prompt)} />)}</Row>
    {question ? <><Card><Copy variant="label" muted>TÚ</Copy><Copy>{question}</Copy></Card><Card tone="accent"><Row><Icon name="creation-outline" /><Copy variant="label">JARVIS</Copy></Row><Copy accessibilityLiveRegion="polite">{response}</Copy></Card></> : null}
    <Card><TextInput accessibilityLabel="Mensaje para JARVIS" value={draft} onChangeText={setDraft} placeholder="¿Qué necesitas resolver?" placeholderTextColor={theme.colors.muted} multiline maxLength={1000} style={styles.input} /><Button label="Consultar" icon="arrow-up" disabled={!draft.trim()} onPress={() => ask(draft)} /></Card>
    <Copy variant="mono" muted>Sin conexión a IA remota. Voz e historial persistente se añadirán en una fase posterior.</Copy>
  </Screen>;
}
const styles = StyleSheet.create({
  orb: { width: 104, height: 104, borderRadius: 52, borderColor: "#3d809e", borderWidth: 1, backgroundColor: "#132838", alignItems: "center", justifyContent: "center" },
  input: { minHeight: 64, maxHeight: 180, textAlignVertical: "top", color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 16, lineHeight: 24 },
});
