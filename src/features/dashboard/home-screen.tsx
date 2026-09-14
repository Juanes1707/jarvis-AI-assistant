import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/layout/screen";
import { SystemBar } from "../../components/layout/system-bar";
import { Button, Copy, DataRow, Icon, Progress, Rail, Row, Section, SectionMarker } from "../../components/ui/primitives";
import { CommandBar } from "../../components/jarvis/command-bar";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { formatDate, formatGrade, formatMoney, formatTime } from "../../lib/utils/format";
import { AgendaList } from "./agenda-list";
import { HabitsCard } from "./habits-card";
import { PriorityFocus } from "./priority-focus";
import { categoryColor, theme } from "../../theme/tokens";

function greet(now: Date) {
  const hour = Number(formatTime(now).slice(0, 2));
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function HomeScreen() {
  const { data, dashboard: vm, preferences } = useWorkspace();
  const now = new Date();
  const subject = vm.priority ? data.subjects.find(item => item.id === vm.priority?.subjectId)?.name : undefined;
  const overspent = vm.finance.remaining !== null && vm.finance.remaining < 0n;
  return <Screen>
    <SystemBar state={preferences.aiEnabled ? "idle" : "offline"} right={<Copy variant="marker">{formatTime(now)}</Copy>} />

    <View style={styles.briefing}>
      <Copy variant="title" accessibilityRole="header">{greet(now)}, {data.user.name}.</Copy>
      <Copy variant="lead" muted>{vm.briefing}</Copy>
    </View>

    <CommandBar />

    {vm.priority ? <View style={styles.focus}>
      <SectionMarker label="LO PRIMERO" />
      <PriorityFocus task={vm.priority} subject={subject} />
    </View> : <Row style={styles.clear}>
      <Icon name="check-circle-outline" color={theme.colors.success} />
      <Copy variant="body" muted>No tienes tareas pendientes.</Copy>
    </Row>}

    <Section label="HOY" trailing={<Button label="Agenda" variant="ghost" onPress={() => router.navigate("/calendar")} />}>
      <AgendaList events={vm.events} />
    </Section>

    <Section label="DINERO" trailing={<Button label="Detalle" variant="ghost" onPress={() => router.push("/finances")} />}>
      <View>
        <DataRow label="Saldo disponible" value={formatMoney(vm.finance.balance)} />
        <DataRow label="Gastado este mes" value={formatMoney(vm.finance.spent)} tone="muted" />
        <DataRow label="Puedes gastar por día" value={vm.finance.daily === null ? "Sin presupuesto" : formatMoney(vm.finance.daily)}
          tone={overspent ? "danger" : "muted"} note={overspent ? "Presupuesto superado" : undefined} />
      </View>
    </Section>

    <Section label="SEMESTRE" trailing={<Button label="Materias" variant="ghost" onPress={() => router.push("/university")} />}>
      <View style={styles.semester}>
        <Row style={styles.grade}>
          <Copy variant="metric">{vm.academic.averageGrade === null ? "—" : formatGrade(vm.academic.averageGrade)}</Copy>
          <View style={styles.gradeMeta}>
            <Copy variant="caption" muted>de 5,00</Copy>
            <Copy variant="caption" muted>{vm.academic.credits} créditos</Copy>
          </View>
        </Row>
        <Progress value={vm.academic.progress} label="Avance del semestre" />
        <Copy variant="caption" muted>Promedio ponderado del semestre {data.user.semester}.</Copy>
      </View>
    </Section>

    <Section label="HÁBITOS"><HabitsCard /></Section>

    {data.exams.length ? <Section label="EN EL HORIZONTE">
      <View>{data.exams.map(exam => <DataRow key={exam.id} dot={categoryColor(exam.title)} label={exam.title} note={`${exam.weight}% de la nota`} value={formatDate(exam.startsAt)} tone="muted" />)}</View>
    </Section> : null}

    {vm.alerts.length ? <Section label="REQUIERE ATENCIÓN">
      <View style={styles.alerts}>{vm.alerts.slice(0, 3).map(alert => <Row key={alert.id} style={styles.alert}>
        <Rail tone={alert.severity === "critical" ? "danger" : "warning"} />
        <View style={styles.grow}>
          <Copy variant="body">{alert.title}</Copy>
          <Copy variant="caption" muted>{alert.reason}</Copy>
        </View>
      </Row>)}</View>
    </Section> : null}

    {preferences.showSuggestions && vm.suggestions.length ? <Section label="SIGUIENTE PASO">
      {vm.suggestions.map(action => <View key={action.id} style={styles.suggestion}>
        <Copy variant="body">{action.title}</Copy>
        <Copy variant="caption" muted>{action.reason}</Copy>
        <Button label="Ver mis tareas" variant="secondary" onPress={() => router.navigate("/tasks")} />
      </View>)}
    </Section> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  briefing: { gap: theme.space.sm },
  focus: { gap: theme.space.ms },
  clear: { gap: theme.space.sm },
  semester: { gap: theme.space.ms },
  grade: { alignItems: "baseline", gap: theme.space.ms },
  gradeMeta: { gap: theme.space.hair },
  grow: { flex: 1 },
  alerts: { gap: theme.space.md },
  alert: { alignItems: "stretch", gap: theme.space.ms },
  suggestion: { gap: theme.space.sm },
});
