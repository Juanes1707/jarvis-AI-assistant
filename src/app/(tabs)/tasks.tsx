import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Badge, Button, Card, Copy, Icon, Progress, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { filterTasks, taskFilters, type TaskFilter } from "../../engines/task-list";
import { formatDate, formatTime } from "../../lib/utils/format";
import { theme } from "../../theme/tokens";

export default function TasksScreen() {
  const { data, dashboard } = useWorkspace();
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const ordered = [...dashboard.tasks, ...data.tasks.filter(task => task.status === "COMPLETED")];
  const tasks = filterTasks(ordered, filter, dashboard.date);
  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <FlatList data={tasks} keyExtractor={task => task.id} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={{ gap: 20, marginBottom: 24 }}>
        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><View style={{ gap: 4 }}><Copy variant="mono" muted>JARVIS / PRODUCTIVIDAD</Copy><Copy variant="title" accessibilityRole="header">Tus tareas</Copy></View><Button label="Nueva" icon="plus" onPress={() => router.push("/tasks/new")} /></Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><Row>{taskFilters.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[styles.filter, filter === item.id && styles.selected]}><Copy style={filter === item.id && { color: theme.colors.accent }}>{item.label} · {filterTasks(ordered, item.id, dashboard.date).length}</Copy></Pressable>)}</Row></ScrollView>
        <Card><Row><Icon name="brain" /><Copy variant="label">PRIORIDAD EXPLICABLE</Copy></Row><Copy muted>Ordenadas según urgencia, impacto académico y trabajo restante. Abre una tarea para ver sus motivos.</Copy><Copy variant="mono" muted>ESCENARIO LOCAL · 08 SEP 2026</Copy></Card>
      </View>}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={<Card><Icon name="check-circle-outline" color={theme.colors.success} /><Copy variant="heading">Todo despejado</Copy><Copy muted>No hay tareas en esta vista.</Copy><Button label="Crear una tarea" secondary onPress={() => router.push("/tasks/new")} /></Card>}
      renderItem={({ item: task }) => {
        const ranking = dashboard.tasks.find(item => item.id === task.id)?.ranking;
        return <Card tone={task.id === dashboard.priority?.id ? "danger" : "default"}>
          <Badge>{data.subjects.find(subject => subject.id === task.subjectId)?.name ?? "INBOX · SIN MATERIA"}</Badge>
          <Copy variant="heading">{task.title}</Copy>
          <Row style={{ flexWrap: "wrap" }}><Icon name="clock-outline" size={18} /><Copy muted>{task.deadline ? `${formatDate(task.deadline)} · ${formatTime(task.deadline)}` : "Sin fecha"} · {task.estimatedMinutes} min</Copy></Row>
          <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Copy variant="mono" style={{ color: theme.colors.accent }}>{task.status === "COMPLETED" ? "COMPLETADA" : `PRIORIDAD ${ranking?.score ?? 0}/100`}</Copy><Copy variant="mono">{task.progress}% completado</Copy></Row>
          <Progress value={task.progress} label={`Progreso de ${task.title}`} />
          <Button label="Ver tarea" icon="arrow-right" secondary onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } })} />
        </Card>;
      }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 16, paddingBottom: 32 },
  filter: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  selected: { borderColor: "#487195", backgroundColor: "#1c293a" },
});
