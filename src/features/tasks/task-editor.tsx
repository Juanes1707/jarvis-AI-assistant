import { useState } from "react";
import { Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { z } from "zod";
import type { AcademicTask } from "../../domain/models";
import { createTaskDraft, parseTaskDraft, type TaskDraft } from "../../domain/task-draft";
import { Screen } from "../../components/layout/screen";
import { Badge, Button, Card, Copy, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { formatDate, formatTime } from "../../lib/utils/format";
import { demoNow } from "../../engines/dashboard";
import { theme } from "../../theme/tokens";

export function TaskEditor({ task }: { task?: AcademicTask }) {
  const { data, saveTask, busy } = useWorkspace();
  const [id] = useState(() => task?.id ?? randomUUID());
  const [draft, setDraft] = useState(() => createTaskDraft(task));
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const change = <K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) => setDraft(previous => ({ ...previous, [field]: value }));
  async function save() {
    setError("");
    let parsed: AcademicTask;
    try { parsed = parseTaskDraft(draft, id, task?.status); }
    catch (cause) {
      setError(cause instanceof z.ZodError ? cause.issues[0].message : "Revisa los datos de la tarea."); return;
    }
    if (await saveTask(parsed, task ? "update" : "create")) router.replace("/tasks");
  }
  return <Screen title={task ? "Editar tarea" : "Nueva tarea"} back>
    <Badge>{task ? "AJUSTA TU PLAN" : "CAPTURA Y ORGANIZA"}</Badge>
    <Copy muted>Sin fecha o materia, la tarea queda en Inbox. Puedes organizarla después.</Copy>
    <Card>
      <Copy variant="label">TÍTULO</Copy>
      <TextInput accessibilityLabel="Título de la tarea" value={draft.title} onChangeText={value => change("title", value)} placeholder="¿Qué necesitas hacer?" placeholderTextColor={theme.colors.muted} style={styles.input} maxLength={240} editable={!busy} multiline />
      <Copy variant="label">MATERIA</Copy>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Row>
        <Button label={draft.subjectId === null ? "✓ Sin materia" : "Sin materia"} secondary disabled={busy} onPress={() => change("subjectId", null)} />
        {data.subjects.map(subject => <Button key={subject.id} label={(draft.subjectId === subject.id ? "✓ " : "") + subject.name} secondary disabled={busy} onPress={() => change("subjectId", subject.id)} />)}
      </Row></ScrollView>
    </Card>
    <Card>
      <Copy variant="label">ENTREGA · HORA DE BOGOTÁ</Copy>
      <Copy>{draft.deadline ? `${formatDate(draft.deadline)} de ${draft.deadline.getUTCFullYear()} · ${formatTime(draft.deadline)}` : "Sin fecha de entrega"}</Copy>
      <Button label={draft.deadline ? "Cambiar fecha" : "Elegir fecha"} icon="calendar-outline" secondary disabled={busy} onPress={() => setPicker("date")} />
      {draft.deadline && <Row style={{ flexWrap: "wrap" }}><Button label="Cambiar hora" icon="clock-outline" secondary disabled={busy} onPress={() => setPicker("time")} /><Button label="Quitar fecha" secondary disabled={busy} onPress={() => { change("deadline", null); setPicker(null); }} /></Row>}
      {picker && <View>
        <DateTimePicker value={draft.deadline ?? new Date(+demoNow + 86_400_000)} mode={picker} display={Platform.OS === "ios" ? "spinner" : "default"} themeVariant="dark" timeZoneName="America/Bogota" is24Hour
          onChange={(event, selected) => {
            if (Platform.OS === "android") setPicker(null);
            if (event.type === "set" && selected) change("deadline", selected);
          }} />
        {Platform.OS === "ios" && <Button label="Listo" secondary onPress={() => setPicker(null)} />}
      </View>}
    </Card>
    <Card>
      <Copy variant="heading">Ayuda a JARVIS a priorizar</Copy>
      <NumberField label="Impacto en la nota (%)" value={draft.academicImpact} onChange={value => change("academicImpact", value)} disabled={busy} />
      <NumberField label="Dificultad (1 a 5)" value={draft.difficulty} onChange={value => change("difficulty", value)} disabled={busy} />
      <NumberField label="Tiempo estimado total (minutos)" value={draft.estimatedMinutes} onChange={value => change("estimatedMinutes", value)} disabled={busy} />
      <NumberField label="Progreso completado (%)" value={draft.progress} onChange={value => change("progress", value)} disabled={busy} />
      <Copy muted>JARVIS calcula la prioridad usando urgencia, impacto, dificultad, trabajo restante y cercanía de exámenes.</Copy>
    </Card>
    {error ? <Copy accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: theme.colors.danger }}>{error}</Copy> : null}
    <Button label={task ? "Guardar cambios" : "Crear tarea"} loading={busy} icon="check" onPress={() => void save()} />
  </Screen>;
}
function NumberField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <View style={{ gap: 8 }}><Copy>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType="number-pad" editable={!disabled} maxLength={5} style={styles.input} /></View>;
}
const styles = StyleSheet.create({
  input: { minHeight: 48, backgroundColor: theme.colors.background, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, fontFamily: theme.fonts.body, fontSize: 16 },
});
