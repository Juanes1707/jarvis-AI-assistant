import { Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { SystemBar } from "../../components/layout/system-bar";
import { Copy, DataRow, Icon, Row, Section, type IconName } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { assistantMode, MODE_LABEL, modeCoreState } from "../../features/jarvis/mode";
import { theme } from "../../theme/tokens";

function NavRow({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.nav, pressed ? styles.pressed : null]}>
    <Icon name={icon} size={18} color={theme.colors.muted} />
    <Copy variant="body" style={styles.grow}>{label}</Copy>
    <Icon name="chevron-right" size={18} color={theme.colors.dim} />
  </Pressable>;
}

/** The tailnet host, never the token. */
function backendHost(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "Sin configurar";
  try {
    const parsed = new URL(trimmed);
    return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  } catch { return trimmed; }
}

export default function ProfileScreen() {
  const { data, preferences, toggleSuggestions, busy } = useWorkspace();
  const mode = assistantMode(preferences);
  const initials = data.user.name.split(" ").slice(0, 2).map(part => part[0]).join("");
  return <Screen>
    <SystemBar state={modeCoreState(preferences)} />

    <Row style={styles.identity}>
      <View style={styles.avatar}><Copy variant="marker" style={styles.initials}>{initials.toLocaleUpperCase("es")}</Copy></View>
      <View style={styles.grow}>
        <Copy variant="title" accessibilityRole="header">{data.user.name}</Copy>
        <Copy variant="caption" muted>Semestre {data.user.semester} · Bogotá</Copy>
      </View>
    </Row>

    <Section label="COMPORTAMIENTO">
      <Row style={styles.toggle}>
        <View style={styles.grow}>
          <Copy variant="body">Sugerencias en Inicio</Copy>
          <Copy variant="caption" muted>Mostrar el siguiente paso recomendado.</Copy>
        </View>
        <Switch accessibilityLabel="Mostrar sugerencias en Inicio" value={preferences.showSuggestions} disabled={busy} onValueChange={() => void toggleSuggestions()}
          trackColor={{ false: theme.colors.elevated, true: theme.colors.accentSoft }} thumbColor={preferences.showSuggestions ? theme.colors.accent : theme.colors.muted} />
      </Row>
      <Copy variant="caption" muted>El modo del asistente, el servidor y la voz se configuran dentro de JARVIS, junto a la conversación.</Copy>
    </Section>

    <Section label="TU VIDA">
      <View>
        <NavRow label="Universidad" icon="school-outline" onPress={() => router.push("/university")} />
        <NavRow label="Finanzas" icon="wallet-outline" onPress={() => router.push("/finances")} />
      </View>
    </Section>

    <Section label="SISTEMA">
      <View>
        <DataRow label="Modo del asistente" value={MODE_LABEL[mode]} tone="accent"
          note={mode === "server" ? "Orquestador multi-agente por Tailscale" : mode === "local" ? preferences.ollamaModel : "Sin modelo; solo órdenes del teléfono"} />
        <DataRow label="Servidor JARVIS" value={preferences.backendEnabled ? "Habilitado" : "Apagado"} tone="muted"
          note={backendHost(preferences.backendUrl ?? "")} />
        <DataRow label="Cerebro local" value={preferences.aiEnabled ? "Activo" : "Apagado"} tone="muted" note={preferences.aiEnabled ? preferences.ollamaModel : "Ollama sin usar"} />
        <DataRow label="Respuestas habladas" value={preferences.voiceEnabled ? "Activas" : "Silenciadas"} tone="muted" />
        <DataRow label="Datos de este teléfono" value="SQLite local" tone="muted" note="Agenda, tareas y movimientos del modo básico" />
        <DataRow label="Versión" value="0.2.0" tone="muted" note="React Native y Expo" />
      </View>
      <Copy variant="caption" muted>
        El token del servidor se guarda solo en este teléfono y nunca aparece en esta pantalla. Incluye registros de ejemplo de septiembre de 2026; las órdenes y los resúmenes usan la fecha actual en Bogotá.
      </Copy>
    </Section>
  </Screen>;
}

const styles = StyleSheet.create({
  identity: { gap: theme.space.md },
  avatar: {
    width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.plate, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  initials: { color: theme.colors.accent, letterSpacing: 1 },
  toggle: { minHeight: theme.touchTarget, gap: theme.space.ms },
  nav: { flexDirection: "row", alignItems: "center", gap: theme.space.ms, minHeight: theme.touchTarget },
  pressed: { opacity: 0.6 },
  grow: { flex: 1 },
});
