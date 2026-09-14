import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { AcademicTask } from "../../domain/models";
import { Button, Copy, Dot, Icon, Progress, Rail, Row, Seam } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { filterTasks, taskFilters, type TaskFilter } from "../../engines/task-list";
import { formatDate, formatTime } from "../../lib/utils/format";
import { isUrgent } from "../../features/tasks/urgency";
import { categoryColor, theme } from "../../theme/tokens";

type TaskRowData = { task: AcademicTask; subject: string; score: number | null; focal: boolean };

const openTask = (id: string) => router.push({ pathname: "/tasks/[id]", params: { id } });

const TaskRow = memo(function TaskRow({ item }: { item: TaskRowData }) {
  const { task, subject, score, focal } = item;
  const done = task.status === "COMPLETED";
  const urgent = !done && isUrgent(task.deadline);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${task.title}. ${subject}. ${task.progress}% completado.`}
    onPress={() => openTask(task.id)} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
    <Rail tone={urgent ? "danger" : done ? "energy" : focal ? "accent" : "muted"} />
    <View style={styles.body}>
      <Row style={styles.subjectRow}>
        <Dot color={done ? theme.colors.dim : categoryColor(subject)} />
        <Copy variant="system" style={urgent ? styles.urgentSubject : focal ? styles.focalSubject : styles.subject}>{subject.toLocaleUpperCase("es")}</Copy>
      </Row>
      <Copy variant="body" style={styles.title}>{task.title}</Copy>
      <Row style={styles.meta}>
        <Icon name="clock-outline" size={13} color={urgent ? theme.colors.danger : theme.colors.dim} />
        <Copy variant="caption" muted>{task.deadline ? `${formatDate(task.deadline)} a las ${formatTime(task.deadline)}` : "Sin fecha"}</Copy>
        <Copy variant="caption" muted>{task.estimatedMinutes} min</Copy>
      </Row>
      <Row style={styles.meter}>
        <View style={styles.grow}><Progress value={task.progress} label={`Progreso de ${task.title}`} tone={urgent ? "danger" : focal ? "accent" : "default"} /></View>
        <Copy variant="system" muted>{done ? "HECHA" : score === null ? `${task.progress}%` : `${score}/100`}</Copy>
      </Row>
    </View>
  </Pressable>;
});

export default function TasksScreen() {
  const { data, dashboard } = useWorkspace();
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const ordered = useMemo(() => [...dashboard.tasks, ...data.tasks.filter(task => task.status === "COMPLETED")], [dashboard.tasks, data.tasks]);
  const counts = useMemo(() => new Map(taskFilters.map(item => [item.id, filterTasks(ordered, item.id, dashboard.date).length])), [ordered, dashboard.date]);
  const rows = useMemo(() => {
    const scores = new Map(dashboard.tasks.map(task => [task.id, task.ranking.score]));
    const subjects = new Map(data.subjects.map(subject => [subject.id, subject.name]));
    return filterTasks(ordered, filter, dashboard.date).map<TaskRowData>(task => ({
      task,
      subject: (task.subjectId ? subjects.get(task.subjectId) : null) ?? "Inbox",
      score: scores.get(task.id) ?? null,
      focal: task.id === dashboard.priority?.id,
    }));
  }, [ordered, filter, dashboard.date, dashboard.tasks, dashboard.priority, data.subjects]);

  const renderItem = useCallback(({ item }: { item: TaskRowData }) => <TaskRow item={item} />, []);
  const keyExtractor = useCallback((item: TaskRowData) => item.task.id, []);

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <FlatList data={rows} keyExtractor={keyExtractor} renderItem={renderItem} contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={<View style={styles.header}>
        <Row style={styles.headRow}>
          <View style={styles.grow}>
            <Copy variant="title" accessibilityRole="header">Tareas</Copy>
            <Copy variant="caption" muted>Ordenadas por urgencia, impacto y trabajo restante.</Copy>
          </View>
          <Button label="Nueva" icon="plus" variant="secondary" onPress={() => router.push("/tasks/new")} />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {taskFilters.map(item => {
            const selected = filter === item.id;
            return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }}
              onPress={() => setFilter(item.id)} style={styles.filter}>
              <Copy variant="body" style={selected ? styles.filterOn : styles.filterOff}>{item.label}</Copy>
              <Copy variant="system" style={selected ? styles.filterOn : styles.countOff}>{counts.get(item.id) ?? 0}</Copy>
              <View style={[styles.filterEdge, selected ? styles.filterEdgeOn : null]} />
            </Pressable>;
          })}
        </ScrollView>
      </View>}
      ListEmptyComponent={<View style={styles.empty}>
        <Icon name="check-circle-outline" color={theme.colors.success} size={22} />
        <Copy variant="section">Todo despejado</Copy>
        <Copy variant="body" muted>No hay tareas en esta vista.</Copy>
        <Button label="Crear una tarea" variant="secondary" onPress={() => router.push("/tasks/new")} />
      </View>} />
  </SafeAreaView>;
}

function Separator() {
  return <Seam style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.space.md, paddingTop: theme.space.sm, paddingBottom: theme.space.xxl },
  header: { gap: theme.space.md, paddingBottom: theme.space.md },
  headRow: { gap: theme.space.ms },
  grow: { flex: 1 },
  filters: { gap: theme.space.lg, paddingRight: theme.space.md },
  filter: { flexDirection: "row", alignItems: "center", gap: theme.space.sm, minHeight: theme.touchTarget, paddingBottom: theme.space.sm },
  filterOn: { color: theme.colors.text },
  filterOff: { color: theme.colors.dim },
  countOff: { color: theme.colors.dim },
  filterEdge: { position: "absolute", left: 0, right: 0, bottom: 0, height: theme.space.hair, borderRadius: theme.radius.hairline, backgroundColor: "transparent" },
  filterEdgeOn: { backgroundColor: theme.colors.accent },
  row: { flexDirection: "row", alignItems: "stretch", gap: theme.space.ms, paddingVertical: theme.space.md },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: theme.space.xs },
  subjectRow: { gap: theme.space.xs },
  subject: { color: theme.colors.dim },
  focalSubject: { color: theme.colors.accent },
  urgentSubject: { color: theme.colors.danger },
  title: { fontFamily: theme.fonts.medium },
  meta: { gap: theme.space.sm, flexWrap: "wrap" },
  meter: { gap: theme.space.ms, paddingTop: theme.space.xs },
  separator: { marginLeft: theme.space.lg },
  empty: { gap: theme.space.sm, alignItems: "flex-start", paddingTop: theme.space.lg },
});
