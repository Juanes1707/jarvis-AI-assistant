import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { BackendStatus } from "../../services/backend/client";
import { Badge, Button, Copy, Dot, Icon, Plate, Row, type IconName } from "../ui/primitives";
import { theme } from "../../theme/tokens";

/** Only four values, and each one is a real answer the server gave — or the absence of one. */
export type BackendCheckState = "idle" | "checking" | "online" | "failed";

const HEAD: Record<BackendCheckState, { icon: IconName; color: string; label: string; tone: "default" | "live" | "alert" }> = {
  idle: { icon: "server-network-off", color: theme.colors.dim, label: "Sin comprobar", tone: "default" },
  checking: { icon: "server-network", color: theme.colors.muted, label: "Comprobando", tone: "default" },
  online: { icon: "server-network", color: theme.colors.energy, label: "Conectado", tone: "live" },
  failed: { icon: "server-network-off", color: theme.colors.danger, label: "Sin conexión", tone: "alert" },
};

function Line({ label, value, color, note }: { label: string; value: string; color: string; note?: string }) {
  return <Row style={styles.line}>
    <Dot color={color} />
    <View style={styles.grow}>
      <Copy variant="body">{label}</Copy>
      {note ? <Copy variant="caption" muted>{note}</Copy> : null}
    </View>
    <Copy variant="caption" muted>{value}</Copy>
  </Row>;
}

/**
 * What the tailnet actually answered. The bearer token never reaches this component, so it
 * cannot leak into a label, an error or a screen reader (X2C-001).
 */
export function BackendStatusPanel({ state, report, error, host, onRetry }: {
  state: BackendCheckState;
  report: BackendStatus | null;
  error?: string;
  host?: string;
  onRetry?: () => void;
}) {
  const head = HEAD[state];
  const llm = report?.llm;
  return <Plate tone={head.tone}>
    <Row style={styles.head}>
      {state === "checking" ? <ActivityIndicator color={theme.colors.accent} size="small" /> : <Icon name={head.icon} size={18} color={head.color} />}
      <View style={styles.grow}><Badge color={head.color}>{head.label.toLocaleUpperCase("es")}</Badge></View>
    </Row>

    {host ? <Copy variant="caption" muted numberOfLines={1}>{host}</Copy> : null}

    {report ? <View style={styles.lines}>
      <Line label="Servidor" value="En línea" color={theme.colors.energy} note="FastAPI tras Tailscale" />
      <Line label="Modelo" value={llm === "available" ? "Listo" : llm === "unavailable" ? "No disponible" : "Con error"}
        color={llm === "available" ? theme.colors.energy : llm === "unavailable" ? theme.colors.warning : theme.colors.danger}
        note={report.model} />
      <Line label="Correo" value={report.email === "configured" ? "Configurado" : "Sin configurar"}
        color={report.email === "configured" ? theme.colors.energy : theme.colors.dim}
        note={report.email === "configured" ? "Buzón IMAP de solo lectura" : "Secretaría no podrá leer correo"} />
      <Line label="Base de datos" value="Disponible" color={theme.colors.energy} note="Esquema relacional del servidor" />
    </View> : null}

    {report?.detail ? <Copy variant="caption" muted accessibilityLiveRegion="polite">{report.detail}</Copy> : null}
    {error ? <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.danger}>{error}</Copy> : null}
    {onRetry ? <Button label={state === "idle" ? "Probar el servidor" : "Volver a probar el servidor"} icon="lan-connect" variant="secondary"
      loading={state === "checking"} onPress={onRetry} /> : null}
  </Plate>;
}

const styles = StyleSheet.create({
  head: { gap: theme.space.sm },
  lines: { gap: theme.space.xs },
  line: { minHeight: 40, gap: theme.space.sm },
  grow: { flex: 1 },
  danger: { color: theme.colors.danger },
});
