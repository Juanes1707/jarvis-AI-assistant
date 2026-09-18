import type { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Copy, Icon, Plate, Rail, Row } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";
import type { ResourceStatus } from "./use-profile";

/**
 * Guards anything that only exists on the server. It deliberately renders nothing from the
 * local demonstration workspace while loading: an empty profile must look empty, never like
 * someone else's sample data (AI_HANDOFF X2C-002).
 */
export function ServerGate({ active, status, error, onRetry, children }: PropsWithChildren<{
  active: boolean;
  status: ResourceStatus;
  error: string;
  onRetry: () => void;
}>) {
  if (!active) return <Row style={styles.block}>
    <Rail tone="muted" />
    <View style={styles.body}>
      <Copy variant="body">Esto vive en tu servidor.</Copy>
      <Copy variant="caption" muted>
        Enciende el modo Servidor en JARVIS, en Ajustes, para ver y editar lo que guarda sobre ti.
      </Copy>
      <Button label="Abrir JARVIS" variant="secondary" icon="server-network" onPress={() => router.navigate("/jarvis")} />
    </View>
  </Row>;

  if (status === "idle" || status === "loading") return <Row style={styles.loading}>
    <ActivityIndicator color={theme.colors.accent} size="small" />
    <Copy variant="system" muted accessibilityLiveRegion="polite">CONSULTANDO AL SERVIDOR</Copy>
  </Row>;

  if (status === "error") return <Plate tone="alert">
    <Row style={styles.head}>
      <Icon name="alert-circle-outline" size={18} color={theme.colors.danger} />
      <Copy variant="section" style={styles.grow}>Sin respuesta del servidor</Copy>
    </Row>
    <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.error}>{error}</Copy>
    <Button label="Reintentar" variant="secondary" icon="refresh" onPress={onRetry} />
  </Plate>;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  block: { alignItems: "stretch", gap: theme.space.ms },
  body: { flex: 1, gap: theme.space.sm },
  loading: { gap: theme.space.ms, minHeight: theme.touchTarget },
  head: { gap: theme.space.sm },
  grow: { flex: 1 },
  error: { color: theme.colors.danger },
});
