import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { z } from "zod";
import type { AcademicTask } from "../../domain/models";
import { createTaskDraft, parseTaskDraft, type TaskDraft } from "../../domain/task-draft";
import { Screen } from "../../components/layout/screen";
import { Button, Copy, Rail, Row, Section, SectionMarker } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { formatDate, formatTime } from "../../lib/utils/format";
import { demoNow } from "../../engines/dashboard";
import { theme } from "../../theme/tokens";

function Chip({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected ? styles.chipOn : null, pressed ? styles.pressed : null]}>
    <Copy variant="caption" style={selected ? styles.chipTextOn : styles.chipText}>{label}</Copy>
  </Pressable>;
}

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
  return <Screen title={task ? "Editar tarea" : "Nueva tarea"} subtitle="Sin fecha ni materia, la tarea queda en Inbox." back>
    <SectionMarker label="QUÉ" />
    <TextInput accessibilityLabel="Título de la tarea" value={draft.title} onChangeText={value => change("title", value)} placeholder="¿Qué necesitas hacer?"
      placeholderTextColor={theme.colors.dim} style={styles.title} maxLength={240} editable={!busy} multiline />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
      <Chip label="Sin materia" selected={draft.subjectId === null} disabled={busy} onPress={() => change("subjectId", null)} />
      {data.subjects.map(subject => <Chip key={subject.id} label={subject.name} selected={draft.subjectId === subject.id} disabled={busy} onPress={() => change("subjectId", subject.id)} />)}
    </ScrollView>

    <Section label="CUÁNDO">
      <Copy variant="body">{draft.deadline ? `${formatDate(draft.deadline)} de ${draft.deadline.getUTCFullYear()} a las ${formatTime(draft.deadline)}` : "Sin fecha de entrega"}</Copy>
      <Copy variant="caption" muted>Hora de Bogotá.</Copy>
      <Row style={styles.dateActions}>
        <Button label={draft.deadline ? "Cambiar fecha" : "Elegir fecha"} icon="calendar-outline" variant="secondary" disabled={busy} onPress={() => setPicker("date")} />
        {draft.deadline ? <Button label="Cambiar hora" icon="clock-outline" variant="secondary" disabled={busy} onPress={() => setPicker("time")} /> : null}
        {draft.deadline ? <Button label="Quitar fecha" variant="ghost" disabled={busy} onPress={() => { change("deadline", null); setPicker(null); }} /> : null}
      </Row>
      {picker ? <View>
        <DateTimePicker value={draft.deadline ?? new Date(+demoNow + 86_400_000)} mode={picker} display={Platform.OS === "ios" ? "spinner" : "default"} themeVariant="dark" timeZoneName="America/Bogota" is24Hour
          onChange={(event, selected) => {
            if (Platform.OS === "android") setPicker(null);
            if (event.type === "set" && selected) change("deadline", selected);
          }} />
        {Platform.OS === "ios" ? <Button label="Listo" variant="secondary" onPress={() => setPicker(null)} /> : null}
      </View> : null}
    </Section>

    <Section label="CÓMO PRIORIZARLA">
      <Copy variant="caption" muted>JARVIS combina urgencia, impacto, dificultad, trabajo restante y cercanía de exámenes.</Copy>
      <NumberField label="Impacto en la nota (%)" value={draft.academicImpact} onChange={value => change("academicImpact", value)} disabled={busy} />
      <NumberField label="Dificultad (1 a 5)" value={draft.difficulty} onChange={value => change("difficulty", value)} disabled={busy} />
      <NumberField label="Tiempo estimado total (minutos)" value={draft.estimatedMinutes} onChange={value => change("estimatedMinutes", value)} disabled={busy} />
      <NumberField label="Progreso completado (%)" value={draft.progress} onChange={value => change("progress", value)} disabled={busy} />
    </Section>

    {error ? <Row style={styles.error}>
      <Rail tone="danger" />
      <Copy variant="caption" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Copy>
    </Row> : null}
    <Button label={task ? "Guardar cambios" : "Crear tarea"} loading={busy} icon="check" onPress={() => void save()} />
  </Screen>;
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <Row style={styles.field}>
    <Copy variant="body" style={styles.fieldLabel}>{label}</Copy>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType="number-pad" editable={!disabled} maxLength={5} style={styles.number} />
  </Row>;
}

const styles = StyleSheet.create({
  title: {
    minHeight: theme.touchTarget, color: theme.colors.text, fontFamily: theme.fonts.medium, fontSize: 17, lineHeight: 24,
    paddingHorizontal: theme.space.ms, paddingVertical: theme.space.ms, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  chips: { gap: theme.space.sm, paddingRight: theme.space.md },
  chip: { minHeight: 38, justifyContent: "center", paddingHorizontal: theme.space.ms, borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.border },
  chipOn: { borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.accentWash },
  chipText: { color: theme.colors.muted },
  chipTextOn: { color: theme.colors.text },
  pressed: { opacity: 0.6 },
  dateActions: { flexWrap: "wrap", gap: theme.space.sm },
  field: { minHeight: theme.touchTarget, gap: theme.space.md },
  fieldLabel: { flex: 1 },
  number: {
    width: 88, minHeight: theme.touchTarget, textAlign: "right", color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: 20,
    paddingHorizontal: theme.space.ms, backgroundColor: theme.colors.surface, borderRadius: theme.radius.control,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  error: { alignItems: "stretch", gap: theme.space.ms },
  errorText: { color: theme.colors.danger, flex: 1 },
});
