import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { AcademicTask } from "../../domain/models";
import { Button, Copy, Dot, Progress, Rail, Row } from "../../components/ui/primitives";
import { formatDate } from "../../lib/utils/format";
import { isUrgent } from "../tasks/urgency";
import { categoryColor, theme } from "../../theme/tokens";

type RankedTask = AcademicTask & { ranking: { score: number; reasons: string[] } };

/** The single focal element on Home. Crimson appears only when the deadline is genuinely close. */
export function PriorityFocus({ task, subject }: { task: RankedTask; subject?: string }) {
  const urgent = isUrgent(task.deadline);
  const label = subject ?? "Sin materia";
  return <Row style={styles.block}>
    <Rail tone={urgent ? "danger" : "accent"} />
    <View style={styles.body}>
      <Row style={styles.subject}>
        <Dot color={categoryColor(label)} glow />
        <Copy variant="system" style={urgent ? styles.urgent : styles.accent}>{label.toLocaleUpperCase("es")}</Copy>
      </Row>
      <Copy variant="section">{task.title}</Copy>
      <Copy variant="caption" muted>{task.ranking.reasons[0]} Vale {task.academicImpact}% de la nota.</Copy>
      <View style={styles.meter}>
        <Row style={styles.meterHead}>
          <Copy variant="caption" muted style={styles.grow}>{task.deadline ? `Entrega ${formatDate(task.deadline)}` : "Sin fecha de entrega"}</Copy>
          <Copy variant="system" style={styles.percent}>{task.progress}%</Copy>
        </Row>
        <Progress value={task.progress} label={`Progreso de ${task.title}`} tone={urgent ? "danger" : "accent"} />
      </View>
      <Button label="Abrir esta tarea" onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} />
    </View>
  </Row>;
}

const styles = StyleSheet.create({
  block: { alignItems: "stretch", gap: theme.space.md },
  body: { flex: 1, gap: theme.space.sm },
  subject: { gap: theme.space.xs },
  accent: { color: theme.colors.accent },
  urgent: { color: theme.colors.danger },
  grow: { flex: 1 },
  meter: { gap: theme.space.sm, paddingTop: theme.space.xs },
  meterHead: { gap: theme.space.sm },
  percent: { color: theme.colors.muted },
});
