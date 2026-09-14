import { StyleSheet, View } from "react-native";
import type { CalendarEvent } from "../../domain/models";
import { Copy, Icon, Row } from "../../components/ui/primitives";
import { formatTime } from "../../lib/utils/format";
import { theme } from "../../theme/tokens";

export function AgendaList({ events }: { events: CalendarEvent[] }) {
  if (!events.length) return <Copy variant="body" muted>Nada agendado para este día.</Copy>;
  return <View style={styles.list}>{events.map(event => {
    const deadline = event.type === "TASK";
    return <Row key={event.id} style={styles.event}>
      <View style={styles.clock}>
        <Copy variant="system" muted>{formatTime(event.startsAt)}</Copy>
        {deadline ? null : <Copy variant="system" style={styles.end}>{formatTime(event.endsAt)}</Copy>}
      </View>
      <View style={[styles.spine, deadline ? styles.spineDeadline : null]} />
      <View style={styles.body}>
        <Copy variant="body" style={styles.title}>{event.title}</Copy>
        <Row style={styles.meta}>
          <Icon name={deadline ? "flag-outline" : event.type === "STUDY" ? "book-open-outline" : "map-marker-outline"} size={14} color={deadline ? theme.colors.danger : theme.colors.dim} />
          <Copy variant="caption" muted>{deadline ? "Fecha límite" : event.location ?? "Sin ubicación"}</Copy>
        </Row>
      </View>
    </Row>;
  })}</View>;
}

const styles = StyleSheet.create({
  list: { gap: theme.space.md },
  event: { alignItems: "stretch", gap: theme.space.ms },
  clock: { width: 44, paddingTop: theme.space.hair, gap: theme.space.hair },
  end: { color: theme.colors.dim },
  spine: { width: 1, backgroundColor: theme.colors.border },
  spineDeadline: { width: theme.space.hair, backgroundColor: theme.colors.danger, borderRadius: theme.radius.hairline },
  body: { flex: 1, gap: theme.space.xs, paddingBottom: theme.space.xs },
  title: { fontFamily: theme.fonts.medium },
  meta: { gap: theme.space.xs },
});
