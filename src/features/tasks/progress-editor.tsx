import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AcademicTask } from "../../domain/models";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { Button, Copy, Progress, Row } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";

export function ProgressEditor({ task }: { task: AcademicTask }) {
  const { updateProgress, busy } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(task.progress));
  async function save() {
    if (!/^\d{1,3}$/.test(draft.trim()) || Number(draft) > 100) {
      Alert.alert("Progreso inválido", "Escribe un número entero entre 0 y 100."); return;
    }
    if (await updateProgress(task.id, Number(draft))) setOpen(false);
  }
  return <View style={{ gap: 12 }}>
    <Row style={{ justifyContent: "space-between" }}><Copy muted>Progreso del taller</Copy><Copy variant="mono" style={{ color: theme.colors.accent }}>{task.progress}%</Copy></Row>
    <Progress value={task.progress} label={`Progreso de ${task.title}`} />
    <Button label={task.progress === 100 ? "Editar progreso" : "Continuar tarea"} icon="play-outline" onPress={() => { setDraft(String(task.progress)); setOpen(true); }} disabled={busy} />
    <Modal visible={open} animationType="none" onRequestClose={() => { if (!busy) setOpen(false); }} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 24 }}>
            <Copy variant="heading">Actualizar progreso</Copy>
            <Copy>{task.title}</Copy>
            <Copy muted>Registrar 100% marca la tarea como completada.</Copy>
            <TextInput accessibilityLabel="Porcentaje completado" keyboardType="number-pad" value={draft} onChangeText={setDraft} maxLength={3} style={styles.input} selectTextOnFocus autoFocus />
            <Button label="Guardar progreso" loading={busy} onPress={() => void save()} />
            <Button label="Cancelar" secondary disabled={busy} onPress={() => setOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.background },
  input: { minHeight: 56, padding: 16, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 20, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
});
