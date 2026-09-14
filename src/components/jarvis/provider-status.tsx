import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Badge, Button, Copy, Icon, Plate, Row, type IconName } from "../ui/primitives";
import { theme } from "../../theme/tokens";

export type AIProviderStatusValue = "checking" | "available" | "unavailable" | "error";

const PRESET: Record<AIProviderStatusValue, { icon: IconName; color: string; label: string; tone: "default" | "live" | "alert" }> = {
  checking: { icon: "timer-sync-outline", color: theme.colors.muted, label: "Comprobando", tone: "default" },
  available: { icon: "check-circle-outline", color: theme.colors.success, label: "Disponible", tone: "default" },
  unavailable: { icon: "cloud-off-outline", color: theme.colors.warning, label: "No disponible", tone: "default" },
  error: { icon: "alert-circle-outline", color: theme.colors.danger, label: "Error", tone: "alert" },
};

export function AIProviderStatus({ status, message, onRetry, retrying }: { status: AIProviderStatusValue; message?: string; onRetry?: () => void; retrying?: boolean }) {
  const preset = PRESET[status];
  const canRetry = !!onRetry && (status === "unavailable" || status === "error");
  return <Plate tone={preset.tone}>
    <Row style={styles.head}>
      {status === "checking" ? <ActivityIndicator color={theme.colors.accent} size="small" /> : <Icon name={preset.icon} color={preset.color} size={18} />}
      <View style={styles.grow}><Badge color={preset.color}>{preset.label.toLocaleUpperCase("es")}</Badge></View>
    </Row>
    {message ? <Copy variant="caption" accessibilityLiveRegion="polite" muted={status === "checking"} style={status === "error" ? styles.danger : undefined}>{message}</Copy> : null}
    {canRetry ? <Button label="Reintentar" icon="refresh" variant="secondary" loading={retrying} onPress={onRetry} /> : null}
  </Plate>;
}

const styles = StyleSheet.create({
  head: { gap: theme.space.sm },
  grow: { flex: 1 },
  danger: { color: theme.colors.danger },
});
