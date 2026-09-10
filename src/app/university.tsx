import { View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Badge, Card, Copy, Progress, SectionTitle } from "../components/ui/primitives";
import { useWorkspace } from "../services/storage/workspace-provider";
import { formatGrade } from "../lib/utils/format";
export default function UniversityScreen() {
  const { data, dashboard } = useWorkspace();
  return <Screen title="Universidad" back><Badge>SEMESTRE {data.user.semester}</Badge><Card><Copy variant="label" muted>PROMEDIO PONDERADO</Copy><Copy variant="title">{dashboard.academic.averageGrade === null ? "—" : formatGrade(dashboard.academic.averageGrade)} / 5,00</Copy><Copy muted>{dashboard.academic.credits} créditos · {data.subjects.length} materias</Copy></Card><SectionTitle title="Tus materias" />
    {data.subjects.map(subject => <Card key={subject.id}><Copy variant="heading">{subject.name}</Copy><Copy muted>{subject.professor}</Copy><Copy>Nota {formatGrade(subject.currentGrade)} · meta {formatGrade(subject.targetGrade)}</Copy><Progress value={subject.progress} label={`Avance de ${subject.name}`} /><View style={{ gap: 4 }}>{subject.currentTopics.map(topic => <Copy key={topic} muted>• {topic}</Copy>)}</View></Card>)}
  </Screen>;
}
