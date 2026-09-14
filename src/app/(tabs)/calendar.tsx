import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/layout/screen";
import { Button, Copy, Row, Section } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { AgendaList } from "../../features/dashboard/agenda-list";
import { bogotaDayBounds, weekStart } from "../../lib/calendar/time";
import { localDateKey, formatDate } from "../../lib/utils/format";
import { taskDeadlines } from "../../engines/task-list";
import { theme } from "../../theme/tokens";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default function CalendarScreen() {
  const { data, dashboard } = useWorkspace();
  const [date, setDate] = useState(dashboard.date);
  const projected = useMemo(() => [...data.events, ...taskDeadlines(data.tasks)], [data.events, data.tasks]);

  const week = useMemo(() => {
    const monday = bogotaDayBounds(weekStart(date)).start;
    return WEEKDAYS.map((letter, index) => {
      const start = new Date(monday.getTime() + index * 86_400_000);
      const key = localDateKey(start);
      const bounds = bogotaDayBounds(key);
      const items = projected.filter(event => event.startsAt < bounds.end && event.endsAt > bounds.start);
      return { key, letter, day: key.slice(8), busy: items.length > 0, deadline: items.some(event => event.type === "TASK") };
    });
  }, [date, projected]);

  const bounds = useMemo(() => bogotaDayBounds(date), [date]);
  const events = useMemo(() => projected
    .filter(event => event.startsAt < bounds.end && event.endsAt > bounds.start)
    .sort((a, b) => +a.startsAt - +b.startsAt), [projected, bounds]);

  return <Screen title="Agenda" subtitle="Clases, estudio y entregas en un mismo lugar.">
    <Row style={styles.week}>
      {week.map(day => {
        const selected = day.key === date;
        const today = day.key === dashboard.date;
        return <Pressable key={day.key} accessibilityRole="button" accessibilityLabel={`Ver ${day.key}`} accessibilityState={{ selected }}
          onPress={() => setDate(day.key)} style={styles.day}>
          <Copy variant="system" style={today ? styles.today : styles.dim}>{day.letter}</Copy>
          <Copy variant="metricSmall" style={selected ? styles.selected : styles.dim}>{day.day}</Copy>
          <View style={[styles.mark, day.deadline ? styles.markDeadline : day.busy ? styles.markBusy : null]} />
          <View style={[styles.edge, selected ? styles.edgeOn : null]} />
        </Pressable>;
      })}
    </Row>

    <Section label={formatDate(bounds.start).toLocaleUpperCase("es")} trailing={date === dashboard.date ? null : <Button label="Volver a hoy" variant="ghost" onPress={() => setDate(dashboard.date)} />}>
      <AgendaList events={events} />
    </Section>

    <Copy variant="caption" muted>Las entregas provienen de tus tareas pendientes; editarlas allí actualiza este día. Los registros iniciales son datos de ejemplo.</Copy>
  </Screen>;
}

const styles = StyleSheet.create({
  week: { justifyContent: "space-between", gap: theme.space.xs },
  day: { flex: 1, alignItems: "center", gap: theme.space.xs, paddingVertical: theme.space.sm, minHeight: theme.touchTarget },
  today: { color: theme.colors.accent },
  dim: { color: theme.colors.dim },
  selected: { color: theme.colors.text },
  mark: { width: theme.space.sm, height: theme.space.hair, borderRadius: theme.radius.hairline, backgroundColor: "transparent" },
  markBusy: { backgroundColor: theme.colors.dim },
  markDeadline: { backgroundColor: theme.colors.danger },
  edge: { position: "absolute", left: theme.space.sm, right: theme.space.sm, bottom: 0, height: theme.space.hair, borderRadius: theme.radius.hairline, backgroundColor: "transparent" },
  edgeOn: { backgroundColor: theme.colors.edge },
});
