import { View } from "react-native";
import type { CalendarEvent } from "../../domain/models";
import { Copy, Icon, Row } from "../../components/ui/primitives";
import { formatTime } from "../../lib/utils/format";
import { theme } from "../../theme/tokens";
export function AgendaList({ events }: { events: CalendarEvent[] }) {
  if (!events.length) return <Copy muted>No hay eventos para este día.</Copy>;
  return <View style={{ gap: 20 }}>{events.map(event => <Row key={event.id} style={{ alignItems: "flex-start" }}>
    <View style={{ width: 52, gap: 4 }}><Copy variant="mono">{formatTime(event.startsAt)}</Copy>{event.type !== "TASK" && <Copy variant="mono" muted>{formatTime(event.endsAt)}</Copy>}</View>
    <View style={{ width: 2, alignSelf: "stretch", backgroundColor: event.type === "STUDY" ? theme.colors.indigo : theme.colors.accent }} />
    <View style={{ flex: 1, gap: 4 }}><Copy style={{ fontFamily: theme.fonts.medium }}>{event.title}</Copy><Row><Icon name={event.type === "TASK" ? "flag-outline" : event.type === "STUDY" ? "book-open-outline" : "map-marker-outline"} size={16} /><Copy muted>{event.type === "TASK" ? "Fecha límite · tarea pendiente" : event.location ?? "Sin ubicación"}</Copy></Row></View>
  </Row>)}</View>;
}
