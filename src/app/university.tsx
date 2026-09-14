import { StyleSheet, View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Copy, Dot, Progress, Rail, Row, Section } from "../components/ui/primitives";
import { useWorkspace } from "../services/storage/workspace-provider";
import { formatGrade } from "../lib/utils/format";
import { categoryColor, theme } from "../theme/tokens";

export default function UniversityScreen() {
  const { data, dashboard } = useWorkspace();
  return <Screen title="Universidad" subtitle={`Semestre ${data.user.semester}`} back>
    <View style={styles.average}>
      <Row style={styles.grade}>
        <Copy variant="metric">{dashboard.academic.averageGrade === null ? "—" : formatGrade(dashboard.academic.averageGrade)}</Copy>
        <View style={styles.gradeMeta}>
          <Copy variant="caption" muted>de 5,00</Copy>
          <Copy variant="caption" muted>{dashboard.academic.credits} créditos</Copy>
        </View>
      </Row>
      <Progress value={dashboard.academic.progress} label="Avance del semestre" />
      <Copy variant="caption" muted>Promedio ponderado por créditos.</Copy>
    </View>

    <Section label="MATERIAS">
    <View style={styles.subjects}>{data.subjects.map(subject => {
      const behind = subject.currentGrade < subject.targetGrade;
      return <Row key={subject.id} style={styles.subject}>
        <Rail tone={behind ? "warning" : "energy"} />
        <View style={styles.body}>
          <Row style={styles.head}>
            <Dot color={categoryColor(subject.name)} />
            <Copy variant="body" style={styles.name}>{subject.name}</Copy>
            <Copy variant="metricSmall">{formatGrade(subject.currentGrade)}</Copy>
          </Row>
          <Row style={styles.head}>
            <Copy variant="caption" muted style={styles.grow}>{subject.professor}</Copy>
            <Copy variant="caption" muted>meta {formatGrade(subject.targetGrade)}</Copy>
          </Row>
          <Progress value={subject.progress} label={`Avance de ${subject.name}`} />
          <View style={styles.topics}>{subject.currentTopics.map(topic => <Copy key={topic} variant="caption" style={styles.topic}>{topic}</Copy>)}</View>
        </View>
      </Row>;
    })}</View>
    </Section>
  </Screen>;
}

const styles = StyleSheet.create({
  average: { gap: theme.space.ms },
  grade: { alignItems: "baseline", gap: theme.space.ms },
  gradeMeta: { gap: theme.space.hair },
  subjects: { gap: theme.space.lg },
  subject: { alignItems: "stretch", gap: theme.space.ms },
  body: { flex: 1, gap: theme.space.sm },
  head: { gap: theme.space.sm },
  name: { flex: 1, fontFamily: theme.fonts.medium },
  grow: { flex: 1 },
  topics: { gap: theme.space.xs, paddingTop: theme.space.hair },
  topic: { color: theme.colors.dim },
});
