import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Row } from "../../components/ui/primitives";
import { ProgressEditor } from "../../features/tasks/progress-editor";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { formatDate, formatTime } from "../../lib/utils/format";
import { calculatePriorityScore } from "../../lib/prioritization/priority";
import { demoNow } from "../../engines/dashboard";
import { theme } from "../../theme/tokens";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dashboard, busy, updateProgress, startTask, deleteTask } = useWorkspace();
  const task = data.tasks.find(item => item.id === id);
  if (!task) return <Screen title="Tarea no disponible" back><Copy>La tarea pudo haber sido eliminada.</Copy><Button label="Ver tareas" onPress={() => router.replace("/tasks")} /></Screen>;
  const current = task;
  const ranking = dashboard.tasks.find(item => item.id === current.id)?.ranking ?? calculatePriorityScore(current, demoNow);
  const subject = data.subjects.find(item => item.id === current.subjectId);
  function confirmDelete() {
    Alert.alert("Eliminar tarea", `¿Eliminar «${current.title}»? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => { void deleteTask(current.id).then(saved => { if (saved) router.replace("/tasks"); }); } },
    ]);
  }
  return <Screen title="Tu siguiente paso" back>
    <Badge>{subject?.name ?? "INBOX · SIN MATERIA"}</Badge><Copy variant="title">{current.title}</Copy>
    <Card tone={current.status === "COMPLETED" ? "default" : "accent"}>
      <Row><Copy variant="heading">Prioridad {ranking.score}/100</Copy></Row>
      {ranking.reasons.map(reason => <Copy key={reason} muted>{reason}</Copy>)}
      <Copy variant="mono" style={{ color: theme.colors.accent }}>Calculada sobre el escenario del 8 SEP 2026</Copy>
    </Card>
    <Card><Copy variant="label" muted>ENTREGA</Copy><Copy>{current.deadline ? `${formatDate(current.deadline)} · ${formatTime(current.deadline)} BOG` : "Sin fecha"}</Copy><Copy muted>Impacto {current.academicImpact}% · dificultad {current.difficulty}/5 · {current.estimatedMinutes} min totales</Copy><ProgressEditor task={current} /></Card>
    <View style={{ gap: 12 }}>
      {current.status !== "COMPLETED" && current.status !== "IN_PROGRESS" && <Button label="Empezar tarea" icon="play" disabled={busy} onPress={() => void startTask(current.id)} />}
      {current.status !== "COMPLETED" && <Button label="Marcar completada" icon="check-circle-outline" disabled={busy} onPress={() => void updateProgress(current.id, 100)} />}
      <Button label="Editar o reprogramar" icon="pencil-outline" secondary disabled={busy} onPress={() => router.push({ pathname: "/tasks/edit/[id]", params: { id: current.id } })} />
      <Button label="Eliminar tarea" icon="delete-outline" secondary disabled={busy} onPress={confirmDelete} />
    </View>
  </Screen>;
}
