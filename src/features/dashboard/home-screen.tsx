import { View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Brand, Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Icon, Progress, Row, SectionTitle } from "../../components/ui/primitives";
import { CommandBar } from "../../components/jarvis/command-bar";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { formatDate, formatGrade, formatMoney } from "../../lib/utils/format";
import { ProgressEditor } from "../tasks/progress-editor";
import { AgendaList } from "./agenda-list";
import { HabitsCard } from "./habits-card";
import { theme } from "../../theme/tokens";

export default function HomeScreen() {
  const { data, dashboard: vm, preferences } = useWorkspace();
  return <Screen>
    <Brand />
    <View style={{ gap: 8 }}><Copy variant="title" accessibilityRole="header">Hola, <Copy variant="title" style={{ color: theme.colors.accent }}>{data.user.name}.</Copy></Copy><Copy muted>Esto es lo que necesita tu atención hoy.</Copy><Copy variant="mono" muted>DATOS LOCALES · {vm.date} · BOGOTÁ</Copy></View>
    <CommandBar />
    <Card tone="accent">
      <Badge>RECOMENDADO POR JARVIS</Badge>
      <Copy style={{ fontSize: 17, lineHeight: 28 }}>{vm.briefing}</Copy>
      <Row><Icon name="creation-outline" color={theme.colors.success} /><Copy variant="mono" muted>Análisis local por reglas</Copy></Row>
      <Button label="Ver mi agenda" icon="arrow-right" secondary onPress={() => router.navigate("/calendar")} />
    </Card>
    {vm.priority ? <Card tone="danger">
      <Badge color={theme.colors.danger}>ALTO IMPACTO ACADÉMICO</Badge>
      <Copy variant="heading">{vm.priority.title}</Copy>
      <Row style={{ alignItems: "stretch" }}>
        <View style={{ flex: 1, gap: 4 }}><Copy variant="label" muted>ENTREGA</Copy><Copy>{vm.priority.deadline ? formatDate(vm.priority.deadline) : "Sin fecha"}</Copy></View>
        <View style={{ flex: 1, gap: 4 }}><Copy variant="label" muted>IMPACTO</Copy><Copy style={{ color: theme.colors.accent }}>{vm.priority.academicImpact}% de la nota</Copy></View>
      </Row>
      <Copy variant="mono" style={{ color: theme.colors.success }}>PRIORIDAD {vm.priority.ranking.score}/100 · {vm.priority.progress}% completado</Copy>
      <ProgressEditor task={vm.priority} />
      <Copy muted>{vm.priority.ranking.reasons[0]}</Copy>
    </Card> : <Card><Icon name="check-circle-outline" color={theme.colors.success} /><Copy variant="heading">Todo al día</Copy><Copy muted>No tienes tareas pendientes.</Copy></Card>}
    <SectionTitle title="Tu agenda de hoy" subtitle="Clases y espacios de estudio" />
    <Card><AgendaList events={vm.events} /><Button label="Abrir agenda" secondary onPress={() => router.navigate("/calendar")} /></Card>
    <SectionTitle title="Tu semestre, en perspectiva" />
    <Card><Row><Icon name="school-outline" /><Copy variant="heading">Universidad</Copy></Row>
      <Row style={{ alignItems: "flex-end", justifyContent: "space-between" }}><Copy variant="title">{vm.academic.averageGrade === null ? "—" : formatGrade(vm.academic.averageGrade)}<Copy muted> / 5,00</Copy></Copy><Copy variant="mono" muted>{vm.academic.credits} CRÉDITOS</Copy></Row>
      <Copy muted>Promedio ponderado · semestre {data.user.semester}</Copy><Progress value={vm.academic.progress} label="Avance del semestre" />
      <Button label="Ver mis materias" icon="arrow-right" secondary onPress={() => router.push("/university")} />
    </Card>
    <LinearGradient colors={["#142332", "#171b2b"]} style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 16 }}>
      <Row><Icon name="wallet-outline" /><Copy variant="heading">Finanzas personales</Copy></Row>
      <Copy variant="label" muted>SALDO DISPONIBLE · COP</Copy><Copy variant="title">{formatMoney(vm.finance.balance)}</Copy>
      <Copy muted>Gastos del mes: {formatMoney(vm.finance.spent)}</Copy><Copy style={{ color: theme.colors.success }}>Por día según presupuesto: {vm.finance.daily === null ? "Sin presupuesto" : formatMoney(vm.finance.daily)}</Copy>
      <Button label="Ver mis finanzas" secondary onPress={() => router.push("/finances")} />
    </LinearGradient>
    <SectionTitle title="Pequeños hábitos, grandes avances" subtitle="Registra tu progreso de hoy" />
    <Card><HabitsCard /></Card>
    <SectionTitle title="En el horizonte" />
    <Card>{data.exams.map(exam => <Row key={exam.id}><Icon name="calendar-alert-outline" color={theme.colors.warning} /><View style={{ flex: 1 }}><Copy>{exam.title}</Copy><Copy muted>{formatDate(exam.startsAt)} · {exam.weight}% de la nota</Copy></View></Row>)}</Card>
    {vm.alerts.length > 0 && <><SectionTitle title="Necesita tu atención" /><Card>{vm.alerts.slice(0, 3).map(alert => <View key={alert.id} style={{ gap: 4 }}><Copy style={{ color: theme.colors.warning }}>{alert.title}</Copy><Copy muted>{alert.reason}</Copy></View>)}</Card></>}
    {preferences.showSuggestions && vm.suggestions.length > 0 && <><SectionTitle title="Siguiente paso sugerido" />{vm.suggestions.map(action => <Card key={action.id} tone="accent"><Copy variant="heading">{action.title}</Copy><Copy muted>{action.reason}</Copy><Button label="Ir a mis tareas" icon="arrow-right" onPress={() => router.navigate("/tasks")} /></Card>)}</>}
  </Screen>;
}
