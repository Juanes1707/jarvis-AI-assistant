import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Button, Copy, Dot, Field, Icon, OptionRow, Rail, Row, Section, Seam } from "../components/ui/primitives";
import { ServerGate } from "../features/profile/server-gate";
import { MEMORY_KINDS, memoryKind } from "../features/profile/kinds";
import { useMemories } from "../features/profile/use-memories";
import { useWorkspace } from "../services/storage/workspace-provider";
import type { BackendMemory, BackendMemoryKind } from "../services/backend/client";
import { formatDate } from "../lib/utils/format";
import { theme } from "../theme/tokens";

function MemoryRow({ memory, disabled, onForget }: { memory: BackendMemory; disabled: boolean; onForget: () => void }) {
  const kind = memoryKind(memory.kind);
  const expires = memory.expires_at ? new Date(memory.expires_at) : null;
  return <Row style={styles.memory}>
    <View style={styles.dot}><Dot color={kind.color} /></View>
    <View style={styles.memoryBody}>
      <Copy variant="body">{memory.content}</Copy>
      {expires && Number.isFinite(expires.getTime())
        ? <Copy variant="caption" muted>Lo olvida el {formatDate(expires)}</Copy>
        : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Olvidar: ${memory.content}`} disabled={disabled} hitSlop={8}
      onPress={onForget} style={({ pressed }) => [styles.forget, pressed ? styles.pressed : null]}>
      <Icon name="close" size={18} color={theme.colors.muted} />
    </Pressable>
  </Row>;
}

export default function MemoryScreen() {
  const { preferences } = useWorkspace();
  const url = preferences.backendUrl ?? "";
  const token = preferences.backendToken ?? "";
  const settings = useMemo(() => ({ url, token }), [url, token]);
  const active = (preferences.backendEnabled ?? false) && url.trim().length > 0 && token.trim().length >= 24;
  const { status, memories, error, mutating, reload, add, forget } = useMemories(settings, active);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BackendMemoryKind>("fact");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");

  const active_memories = memories.filter(memory => memory.status !== "forgotten");
  const grouped = MEMORY_KINDS.map(item => ({ ...item, items: active_memories.filter(memory => memory.kind === item.value) }))
    .filter(group => group.items.length > 0);

  function confirmForget(memory: BackendMemory) {
    Alert.alert("Olvidar esto", `JARVIS dejará de tener en cuenta «${memory.content}». No se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Olvidar", style: "destructive", onPress: () => { setSaved(""); void forget(memory.id); } },
    ]);
  }

  async function submit() {
    const text = content.trim();
    if (!text) return;
    const ok = await add({ kind, content: text });
    if (ok) { setContent(""); setOpen(false); setSaved(text); }
  }

  return <Screen title="Su memoria" subtitle="Lo que JARVIS ha confirmado sobre ti. Puedes añadir o borrar lo que quieras." back>
    <ServerGate active={active} status={status} error={error} onRetry={reload}>
      {active_memories.length === 0 ? <Row style={styles.intro}>
        <Rail />
        <View style={styles.introBody}>
          <Copy variant="body">Todavía no recuerda nada sobre ti.</Copy>
          <Copy variant="caption" muted>
            Aprende cuando confirmas algo en una conversación, o puedes enseñarle algo directamente aquí abajo.
          </Copy>
        </View>
      </Row> : null}

      {grouped.map(group => <Section key={group.value} label={group.plural.toLocaleUpperCase("es")}>
        <View>{group.items.map((memory, index) => <View key={memory.id}>
          {index === 0 ? null : <Seam style={styles.separator} />}
          <MemoryRow memory={memory} disabled={mutating} onForget={() => confirmForget(memory)} />
        </View>)}</View>
      </Section>)}

      {error ? <Row style={styles.notice}>
        <Rail tone="danger" />
        <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Copy>
      </Row> : null}
      {saved ? <Row style={styles.notice}>
        <Rail tone="energy" />
        <Copy variant="caption" muted accessibilityLiveRegion="polite">Guardado: {saved}</Copy>
      </Row> : null}

      {open ? <Section label="ENSEÑARLE ALGO">
        <Copy variant="caption" muted>JARVIS trata cada tipo de forma distinta al responderte.</Copy>
        <View>{MEMORY_KINDS.map(item => <OptionRow key={item.value} label={item.label} note={item.note}
          selected={kind === item.value} disabled={mutating} onPress={() => setKind(item.value)} />)}</View>
        <Field label="QUÉ DEBE RECORDAR" value={content} onChangeText={setContent} editable={!mutating} multiline
          placeholder="Los martes tengo laboratorio hasta las 8 p. m." />
        <Button label="Guardar en su memoria" icon="content-save-outline" loading={mutating} disabled={!content.trim()} onPress={() => void submit()} />
        <Button label="Cancelar" variant="ghost" disabled={mutating} onPress={() => { setOpen(false); setContent(""); }} />
      </Section> : <Button label="Enseñarle algo" variant="secondary" icon="plus" disabled={mutating} onPress={() => { setSaved(""); setOpen(true); }} />}
    </ServerGate>
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { alignItems: "stretch", gap: theme.space.ms },
  introBody: { flex: 1, gap: theme.space.xs },
  memory: { minHeight: 52, gap: theme.space.ms, paddingVertical: theme.space.sm },
  dot: { paddingTop: theme.space.xs, alignSelf: "flex-start" },
  memoryBody: { flex: 1, gap: theme.space.hair },
  forget: { width: 40, height: 40, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  pressed: { opacity: 0.6 },
  separator: { marginLeft: theme.space.lg },
  notice: { alignItems: "stretch", gap: theme.space.ms },
  errorText: { color: theme.colors.danger, flex: 1 },
});
