import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { AgendaList } from "../../features/dashboard/agenda-list";
import { bogotaDayBounds } from "../../lib/calendar/time";
import { localDateKey, formatDate } from "../../lib/utils/format";
import { taskDeadlines } from "../../engines/task-list";

export default function CalendarScreen() {
  const { data, dashboard } = useWorkspace();
  const [date, setDate] = useState(dashboard.date);
  const bounds = bogotaDayBounds(date);
  const events = [...data.events, ...taskDeadlines(data.tasks)].filter(e => e.startsAt < bounds.end && e.endsAt > bounds.start).sort((a, b) => +a.startsAt - +b.startsAt);
  const move = (days: number) => setDate(localDateKey(new Date(+bounds.start + days * 86_400_000)));
  return <Screen title="Tu agenda"><Copy muted>Encuentra espacio para lo que importa.</Copy><Badge>ESCENARIO DE DEMOSTRACIÓN</Badge>
    <Row><View style={{ flex: 1 }}><Button label="Anterior" icon="chevron-left" secondary onPress={() => move(-1)} /></View><View style={{ flex: 1 }}><Button label="Siguiente" icon="chevron-right" secondary onPress={() => move(1)} /></View></Row>
    <Copy variant="heading">{formatDate(bounds.start)} · {date.slice(0, 4)}</Copy>
    <Card><AgendaList events={events} /></Card>
    {date !== dashboard.date && <Button label="Volver al día de demostración" secondary onPress={() => setDate(dashboard.date)} />}
    <Copy muted>Vista diaria local. Las propuestas para reorganizar tu semana se incorporarán en la fase académica.</Copy>
  </Screen>;
}
