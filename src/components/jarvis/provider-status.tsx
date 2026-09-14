import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Badge, Button, Card, Copy, Icon, Row, type IconName } from "../ui/primitives";
import { theme } from "../../theme/tokens";

export type AIProviderStatusValue = "checking" | "available" | "unavailable" | "error";

const PRESET: Record<AIProviderStatusValue, { icon: IconName; color: string; label: string; tone: "default" | "accent" | "danger" }> = {
  checking: { icon: "timer-sync-outline", color: theme.colors.muted, label: "Comprobando", tone: "default" },
  available: { icon: "check-circle-outline", color: theme.colors.success, label: "Disponible", tone: "accent" },
  unavailable: { icon: "cloud-off-outline", color: theme.colors.warning, label: "No disponible", tone: "default" },
  error: { icon: "alert-circle-outline", color: theme.colors.danger, label: "Error", tone: "danger" },
};

export function AIProviderStatus({ status, message, onRetry, retrying }: { status: AIProviderStatusValue; message?: string; onRetry?: () => void; retrying?: boolean }) {
  const preset = PRESET[status];
  const canRetry = !!onRetry && (status === "unavailable" || status === "error");
  return <Card tone={preset.tone}>
    <Row>
      {status === "checking" ? <ActivityIndicator color={theme.colors.accent} /> : <Icon name={preset.icon} color={preset.color} />}
      <View style={styles.grow}><Badge color={preset.color}>{preset.label.toLocaleUpperCase("es")}</Badge></View>
    </Row>
    {!!message && <Copy accessibilityLiveRegion="polite" muted={status === "checking"} style={status === "error" ? styles.danger : undefined}>{message}</Copy>}
    {canRetry && <Button label="Reintentar" icon="refresh" secondary loading={retrying} onPress={onRetry!} />}
  </Card>;
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  danger: { color: theme.colors.danger },
});
