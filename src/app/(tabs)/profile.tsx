import { Switch, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { theme } from "../../theme/tokens";
export default function ProfileScreen() {
  const { data, preferences, toggleSuggestions, busy } = useWorkspace();
  return <Screen title="Tu espacio"><Card><Copy variant="title">{data.user.name}</Copy><Copy muted>Semestre {data.user.semester} · Bogotá · COP</Copy><Badge>PERFIL DE DEMOSTRACIÓN</Badge></Card>
    <Card><Copy variant="heading">Preferencias</Copy><Row><View style={{ flex: 1 }}><Copy>Sugerencias en Inicio</Copy><Copy muted>Mostrar el siguiente paso recomendado.</Copy></View><Switch accessibilityLabel="Mostrar sugerencias en Inicio" value={preferences.showSuggestions} disabled={busy} onValueChange={() => void toggleSuggestions()} trackColor={{ false: "#334155", true: "#0369a1" }} thumbColor={theme.colors.accent} /></Row></Card>
    <Button label="Universidad" secondary icon="school-outline" onPress={() => router.push("/university")} /><Button label="Finanzas" secondary icon="wallet-outline" onPress={() => router.push("/finances")} />
    <Card><Copy variant="heading">JARVIS Mobile</Copy><Copy muted>Datos guardados en este dispositivo. Incluye registros de ejemplo de septiembre de 2026. Las órdenes y los resúmenes usan la fecha actual en Bogotá.</Copy><Copy variant="mono" muted>VERSIÓN 0.2 · REACT NATIVE + EXPO</Copy></Card>
  </Screen>;
}
