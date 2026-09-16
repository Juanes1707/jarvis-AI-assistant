import { StyleSheet } from "react-native";
import { Button, Copy, Icon, Plate, Row } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";

/** Where the write will land. The two stores are never interchangeable, so neither is the copy. */
export type ActionOrigin = "device" | "server";

const NOTE: Record<ActionOrigin, string> = {
  device: "Se guardará en este teléfono al confirmar. También puedes pulsar el micrófono y decir «confirmar» o «cancelar».",
  server: "Nada se ha escrito todavía. Al confirmar, el servidor aplica el cambio una sola vez, aunque reintentes.",
};

/**
 * Nothing with a lasting consequence happens without this plate appearing first
 * (DESIGN_SYNC §19): the amount, the date and the target are readable before the write.
 */
export function PendingAction({ title, detail, origin, saving, disabled, onConfirm, onCancel }: {
  title: string;
  detail: string;
  origin: ActionOrigin;
  saving?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  return <Plate tone="live">
    <Row style={styles.head}>
      <Icon name={origin === "server" ? "cloud-upload-outline" : "clipboard-check-outline"} size={18} color={theme.colors.accent} />
      <Copy variant="section" style={styles.grow}>{title}</Copy>
    </Row>
    <Copy variant="body">{detail}</Copy>
    <Copy variant="caption" muted>{NOTE[origin]}</Copy>
    <Button label="Confirmar cambio" icon="check" loading={saving} disabled={disabled} onPress={onConfirm} />
    {onCancel ? <Button label="Cancelar" variant="ghost" disabled={saving || disabled} onPress={onCancel} /> : null}
  </Plate>;
}

const styles = StyleSheet.create({
  head: { gap: theme.space.sm },
  grow: { flex: 1 },
});
