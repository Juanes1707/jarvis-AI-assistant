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
  return <View style={styles.wrap}>
    <Row style={styles.head}>
      <Copy variant="caption" muted style={styles.grow}>Progreso</Copy>
      <Copy variant="system">{task.progress}%</Copy>
    </Row>
    <Progress value={task.progress} label={`Progreso de ${task.title}`} tone="accent" />
    <Button label={task.progress === 100 ? "Editar progreso" : "Continuar tarea"} icon="play-outline" onPress={() => { setDraft(String(task.progress)); setOpen(true); }} disabled={busy} />
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <KeyboardAvoidingView style={styles.grow} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet}>
            <Copy variant="title" accessibilityRole="header">Actualizar progreso</Copy>
            <Copy variant="body" muted>{task.title}</Copy>
            <TextInput accessibilityLabel="Porcentaje completado" keyboardType="number-pad" value={draft} onChangeText={setDraft} maxLength={3} style={styles.input} selectTextOnFocus autoFocus />
            <Copy variant="caption" muted>Registrar 100% marca la tarea como completada.</Copy>
            <Button label="Guardar progreso" loading={busy} onPress={() => void save()} />
            <Button label="Cancelar" variant="ghost" disabled={busy} onPress={() => setOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.ms },
  head: { gap: theme.space.sm },
  grow: { flex: 1 },
  modal: { flex: 1, backgroundColor: theme.colors.background },
  sheet: { padding: theme.space.lg, gap: theme.space.md },
  input: {
    minHeight: 64, paddingHorizontal: theme.space.md, color: theme.colors.text, fontFamily: theme.fonts.display, fontSize: 34,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.control,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
});
