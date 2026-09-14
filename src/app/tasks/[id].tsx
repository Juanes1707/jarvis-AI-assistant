import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { Button, Copy, Rail, Row, Section, Seam } from "../../components/ui/primitives";
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
  if (!task) return <Screen title="Tarea no disponible" back>
    <Copy variant="body">La tarea pudo haber sido eliminada.</Copy>
    <Button label="Ver tareas" onPress={() => router.replace("/tasks")} />
  </Screen>;
  const current = task;
  const live = dashboard.tasks.find(item => item.id === current.id)?.ranking;
  const ranking = live ?? calculatePriorityScore(current, demoNow);
  const subject = data.subjects.find(item => item.id === current.subjectId);
  const done = current.status === "COMPLETED";
  function confirmDelete() {
    Alert.alert("Eliminar tarea", `¿Eliminar «${current.title}»? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => { void deleteTask(current.id).then(saved => { if (saved) router.replace("/tasks"); }); } },
    ]);
  }
  return <Screen back>
    <View style={styles.heading}>
      <Copy variant="system" style={styles.subject}>{(subject?.name ?? "Inbox").toLocaleUpperCase("es")}</Copy>
      <Copy variant="title" accessibilityRole="header">{current.title}</Copy>
    </View>

    <Row style={styles.priority}>
      <Rail tone={done ? "energy" : "accent"} />
      <View style={styles.body}>
        <Copy variant="system" style={done ? styles.dim : styles.accent}>PRIORIDAD {ranking.score}/100</Copy>
        {ranking.reasons.map(reason => <Copy key={reason} variant="caption" muted>{reason}</Copy>)}
        <Copy variant="caption" style={styles.dim}>{live ? "Calculada con la fecha actual de Bogotá." : "Calculada sobre el escenario de ejemplo."}</Copy>
      </View>
    </Row>

    <Section label="ENTREGA">
      <View style={styles.delivery}>
        <Copy variant="body">{current.deadline ? `${formatDate(current.deadline)} a las ${formatTime(current.deadline)}` : "Sin fecha de entrega"}</Copy>
        <Copy variant="caption" muted>Vale {current.academicImpact}% de la nota. Dificultad {current.difficulty} de 5. {current.estimatedMinutes} minutos estimados.</Copy>
      </View>
      <ProgressEditor task={current} />
    </Section>

    <Seam />

    <View style={styles.actions}>
      {done || current.status === "IN_PROGRESS" ? null : <Button label="Empezar tarea" icon="play" disabled={busy} onPress={() => void startTask(current.id)} />}
      {done ? null : <Button label="Marcar completada" icon="check-circle-outline" variant="secondary" disabled={busy} onPress={() => void updateProgress(current.id, 100)} />}
      <Button label="Editar o reprogramar" icon="pencil-outline" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: "/tasks/edit/[id]", params: { id: current.id } })} />
      <Button label="Eliminar tarea" icon="delete-outline" variant="danger" disabled={busy} onPress={confirmDelete} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: theme.space.xs },
  subject: { color: theme.colors.muted },
  priority: { alignItems: "stretch", gap: theme.space.ms },
  body: { flex: 1, gap: theme.space.xs },
  accent: { color: theme.colors.accent },
  dim: { color: theme.colors.dim },
  delivery: { gap: theme.space.xs },
  actions: { gap: theme.space.sm },
});
