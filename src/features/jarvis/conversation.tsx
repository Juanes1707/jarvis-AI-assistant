import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Button, Copy, Icon, OrbButton, Plate, Rail, Row, SectionMarker } from "../../components/ui/primitives";
import { AIProviderStatus, type AIProviderStatusValue } from "../../components/jarvis/provider-status";
import { JarvisCore, type CoreState } from "../../components/jarvis/core";
import { JarvisDial } from "../../components/jarvis/dial";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { recognizeSpeech } from "../../services/voice/recognition";
import { useJarvisVoice } from "../../services/voice/use-jarvis-voice";
import { buildJarvisSystemPrompt } from "../../services/ai/context";
import { askOllama, checkOllama, type ChatMessage } from "../../services/ai/ollama";
import { getAIProviderStatus } from "../../services/ai/provider";
import { theme } from "../../theme/tokens";
import { interpretCommand, type CommandProposal } from "./commands";

type Message = { id: string; role: "user" | "assistant"; text: string };
const welcome = "A tu servicio. Puedo ayudarte con tu agenda y registrar cambios. Dime qué necesitas, Juan.";
const STARTERS = ["Mis finanzas", "Tareas pendientes", "Agrega un gasto de 100.000 pesos hoy"];

export function JarvisConversation({ initialQuestion = "" }: { initialQuestion?: string }) {
  const { data, preferences, busy, executeCommand, setVoicePreferences, setAiPreferences } = useWorkspace();
  const [draft, setDraft] = useState("");
  const initialMessages = (() => {
    const result = initialQuestion ? interpretCommand(initialQuestion, data, new Date(), randomUUID()) : null;
    return initialQuestion ? [{ id: "initial-user", role: "user", text: initialQuestion }, { id: "welcome", role: "assistant", text: result?.kind === "reply" ? result.message : "Dime la orden para revisar qué cambiará." }] : [{ id: "welcome", role: "assistant", text: welcome }];
  })() as Message[];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [proposal, setProposal] = useState<CommandProposal | null>(null);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(preferences.ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(preferences.ollamaModel);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatusValue | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | undefined>(undefined);
  const [headerAvailability, setHeaderAvailability] = useState<AIProviderStatusValue | null>(null);
  const pending = useRef<CommandProposal | null>(null);
  const locked = useRef(false);
  const recognitionActive = useRef(false);
  const focused = useRef(true);
  const requestActive = useRef(false);
  const messageHistory = useRef<Message[]>(initialMessages);
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const voice = useJarvisVoice(preferences.voiceId);
  const { stop } = voice;
  const refreshHeaderAvailability = useCallback(async () => {
    setHeaderAvailability("checking");
    const result = await getAIProviderStatus();
    setHeaderAvailability(result.status);
  }, []);
  const aiEnabled = preferences.aiEnabled;
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (aiEnabled) void refreshHeaderAvailability();
    return () => { focused.current = false; void stop(); };
  }, [stop, aiEnabled, refreshHeaderAvailability]));

  function append(role: Message["role"], text: string) {
    messageHistory.current = [...messageHistory.current, { id: randomUUID(), role, text }].slice(-40);
    setMessages(messageHistory.current);
  }
  function answer(text: string) {
    append("assistant", text);
    if (preferences.voiceEnabled && focused.current) void voice.speak(text);
  }
  function cancel() {
    if (locked.current) return;
    pending.current = null; setProposal(null);
    answer("Propuesta cancelada. No se guardó ningún cambio.");
  }
  async function confirm() {
    if (locked.current || busy) return;
    const action = pending.current;
    if (!action) { answer("No hay ningún cambio pendiente de confirmar."); return; }
    locked.current = true; setSaving(true); await voice.stop();
    try {
      const saved = await executeCommand(action);
      if (saved) {
        pending.current = null; setProposal(null);
        answer(`Listo. ${action.title}: ${action.detail}. El cambio está guardado en tu dispositivo.`);
      } else answer("No pude confirmar el guardado. Conservé la propuesta; puedes reintentar sin duplicar la operación.");
    } catch { answer("No pude confirmar el guardado. Puedes reintentar la misma propuesta."); }
    finally { locked.current = false; setSaving(false); }
  }
  async function ask(value: string) {
    if (!value.trim() || locked.current || busy || requestActive.current) return;
    const text = value.trim();
    append("user", text); setDraft(""); setNotice("");
    const result = interpretCommand(text, data, new Date(), randomUUID());
    if (result.kind === "confirm") { await confirm(); return; }
    if (result.kind === "cancel") {
      if (pending.current) cancel(); else answer("No hay ningún cambio pendiente.");
      return;
    }
    if (pending.current) {
      answer("Primero confirma o cancela la propuesta pendiente. Puedes decir «confirmar» o «cancelar». Después dime la nueva orden.");
      return;
    }
    if (result.kind === "proposal") {
      pending.current = result.proposal; setProposal(result.proposal);
      answer(`Voy a ${result.proposal.title.toLocaleLowerCase("es")}: ${result.proposal.detail}. Revisa los datos y di «confirmar» o «cancelar».`);
    } else if (result.kind === "reply") {
      if (!preferences.aiEnabled) { answer(result.message); return; }
      requestActive.current = true; setThinking(true);
      try {
        const history: ChatMessage[] = messageHistory.current.slice(-12).map(message => ({ role: message.role, content: message.text }));
        const response = await askOllama(
          { url: preferences.ollamaUrl, model: preferences.ollamaModel },
          buildJarvisSystemPrompt(data, new Date()),
          history,
        );
        if (focused.current) answer(response);
      } catch (error) {
        if (focused.current) answer(`${error instanceof Error ? error.message : "No pude consultar el cerebro local."}\n\nComo alternativa local: ${result.message}`);
      } finally { requestActive.current = false; setThinking(false); }
    }
  }
  async function listen() {
    if (recognitionActive.current || locked.current || busy) return;
    if (Platform.OS !== "android") {
      input.current?.focus(); setNotice("Usa el micrófono del teclado de tu iPhone para dictar y pulsa Enviar."); return;
    }
    recognitionActive.current = true; setListening(true); setNotice("");
    await voice.stop();
    try {
      const transcript = await recognizeSpeech();
      if (focused.current && transcript) void ask(transcript);
    } catch (error) {
      if (focused.current) setNotice(error instanceof Error ? error.message : "No pude escuchar. Inténtalo de nuevo.");
    } finally { recognitionActive.current = false; setListening(false); }
  }
  async function saveBrainSettings() {
    const saved = await setAiPreferences({ aiEnabled: preferences.aiEnabled, ollamaUrl: ollamaUrl.trim(), ollamaModel: ollamaModel.trim() || "qwen3.5:4b" });
    if (saved) {
      setNotice("Configuración del cerebro local guardada.");
      if (preferences.aiEnabled) void refreshHeaderAvailability();
    }
  }
  async function testBrainConnection() {
    setProviderStatus("checking"); setProviderMessage(undefined);
    try {
      const result = await checkOllama({ url: ollamaUrl, model: ollamaModel || "qwen3.5:4b" });
      if (result.installed) { setProviderStatus("available"); setProviderMessage("Ollama está listo y el modelo está instalado."); }
      else { setProviderStatus("unavailable"); setProviderMessage("Ollama responde, pero no encuentro ese modelo. Revisa el nombre con `ollama list`."); }
    } catch (error) { setProviderStatus("error"); setProviderMessage(error instanceof Error ? error.message : "No pude comprobar Ollama."); }
  }

  const brainDown = !aiEnabled || headerAvailability === "unavailable" || headerAvailability === "error";
  const providerLabel = !aiEnabled ? "A TU SERVICIO"
    : headerAvailability === "checking" ? "COMPROBANDO CEREBRO LOCAL"
    : headerAvailability === "unavailable" || headerAvailability === "error" ? "CEREBRO LOCAL SIN CONEXIÓN"
    : "CEREBRO LOCAL ACTIVO";
  const status = listening ? "ESCUCHANDO" : saving ? "GUARDANDO" : thinking ? "PENSANDO LOCALMENTE" : voice.speaking ? "JARVIS HABLANDO" : providerLabel;
  const live = listening || saving || thinking || voice.speaking;
  const coreState: CoreState = listening ? "listening" : saving || thinking ? "thinking" : voice.speaking ? "speaking" : brainDown ? "offline" : "idle";
  const busyComposing = saving || listening || busy || thinking;
  // The instrument is the empty state: it introduces JARVIS, then yields the space to the conversation.
  const showInstrument = messages.length <= 1 && !settings && !proposal;

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Row style={styles.header}>
        <JarvisCore state={coreState} size={38} />
        <View style={styles.grow}>
          <Copy variant="marker" style={styles.mark}>JARVIS</Copy>
          <Copy variant="system" accessibilityLiveRegion="polite" style={live ? styles.accent : styles.muted}>{status}</Copy>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={settings ? "Cerrar ajustes" : "Ajustes"} hitSlop={10} onPress={() => setSettings(value => !value)} style={styles.gear}>
          <Icon name={settings ? "close" : "tune-variant"} size={20} color={theme.colors.muted} />
        </Pressable>
      </Row>

      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        onContentSizeChange={() => { if (settings) scroll.current?.scrollTo({ y: 0, animated: true }); else scroll.current?.scrollToEnd({ animated: true }); }}>
        {settings ? <View style={styles.settings}>
          <SectionMarker label="VOZ" />
          <Copy variant="caption" muted>Estilo sereno, tono grave y ritmo pausado. El timbre depende de las voces instaladas en tu teléfono.</Copy>
          <Row style={styles.toggle}>
            <Copy variant="body" style={styles.grow}>Respuestas habladas</Copy>
            <Switch accessibilityLabel="Respuestas habladas" value={preferences.voiceEnabled} disabled={busy} trackColor={{ false: theme.colors.elevated, true: theme.colors.accentSoft }} thumbColor={preferences.voiceEnabled ? theme.colors.accent : theme.colors.muted}
              onValueChange={enabled => { if (!enabled) void voice.stop(); void setVoicePreferences({ voiceEnabled: enabled, voiceId: preferences.voiceId }); }} />
          </Row>
          <Button label="Probar voz" variant="secondary" icon="volume-high" onPress={() => void voice.speak("A tu servicio, Juan. Sistemas preparados. ¿Qué necesitas resolver hoy?")} />
          <Copy variant="caption" muted>Voces en español instaladas en este teléfono.</Copy>
          <Button label={`${preferences.voiceId === null ? "✓ " : ""}Selección automática`} variant="secondary" disabled={busy} onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: null }); }} />
          {voice.voices.map(item => <Button key={item.identifier} label={`${preferences.voiceId === item.identifier ? "✓ " : ""}${item.name} · ${item.language}`} variant="secondary" disabled={busy} onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: item.identifier }); }} />)}
          {voice.voices.length ? null : <Copy variant="caption" muted>Se usará la voz del sistema. Puedes instalar más voces en los ajustes de tu teléfono.</Copy>}

          <SectionMarker label="CEREBRO LOCAL" />
          <Copy variant="caption" muted>El modelo se ejecuta en tu computador. Las acciones que cambian datos siguen pidiendo tu confirmación.</Copy>
          <Row style={styles.toggle}>
            <Copy variant="body" style={styles.grow}>Usar Ollama para conversar</Copy>
            <Switch accessibilityLabel="Usar Ollama para conversar" value={preferences.aiEnabled} disabled={busy} trackColor={{ false: theme.colors.elevated, true: theme.colors.accentSoft }} thumbColor={preferences.aiEnabled ? theme.colors.accent : theme.colors.muted}
              onValueChange={enabled => { void (async () => { await setAiPreferences({ aiEnabled: enabled, ollamaUrl: ollamaUrl.trim(), ollamaModel: ollamaModel.trim() || "qwen3.5:4b" }); if (enabled) void refreshHeaderAvailability(); })(); }} />
          </Row>
          <TextInput accessibilityLabel="Dirección de Ollama" value={ollamaUrl} onChangeText={setOllamaUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.1.20:11434" placeholderTextColor={theme.colors.dim} editable={!busy} style={styles.field} />
          <TextInput accessibilityLabel="Modelo de Ollama" value={ollamaModel} onChangeText={setOllamaModel} autoCapitalize="none" autoCorrect={false} placeholder="qwen3.5:4b" placeholderTextColor={theme.colors.dim} editable={!busy} style={styles.field} />
          <Button label="Guardar cerebro local" variant="secondary" disabled={busy} onPress={() => void saveBrainSettings()} />
          {providerStatus === null
            ? <Button label="Probar conexión" variant="secondary" icon="lan-connect" disabled={busy} onPress={() => void testBrainConnection()} />
            : <AIProviderStatus status={providerStatus} message={providerMessage} retrying={providerStatus === "checking"} onRetry={() => void testBrainConnection()} />}
          <Copy variant="caption" muted>En el celular usa la IP privada de tu computador, no `localhost`. Ambos deben estar en la misma Wi‑Fi y Ollama debe aceptar conexiones de red.</Copy>
        </View> : null}

        {messages.map(message => message.role === "user"
          ? <View key={message.id} style={styles.userTurn}>
            <Copy selectable accessibilityLabel={`Tú: ${message.text}`}>{message.text}</Copy>
          </View>
          : <Row key={message.id} style={styles.assistantTurn}>
            <Rail tone={brainDown ? "muted" : "accent"} />
            <Copy selectable accessibilityLabel={`JARVIS: ${message.text}`} style={styles.grow}>{message.text}</Copy>
          </Row>)}

        {proposal ? <Plate tone="live">
          <Row style={styles.proposalHead}>
            <Icon name="clipboard-check-outline" size={18} color={theme.colors.accent} />
            <Copy variant="section" style={styles.grow}>{proposal.title}</Copy>
          </Row>
          <Copy variant="body">{proposal.detail}</Copy>
          <Copy variant="caption" muted>Se guardará al confirmar. También puedes pulsar el micrófono y decir «confirmar» o «cancelar».</Copy>
          <Button label="Confirmar cambio" icon="check" loading={saving} disabled={busy || listening} onPress={() => void confirm()} />
          <Button label="Cancelar" variant="ghost" disabled={saving || busy || listening} onPress={cancel} />
        </Plate> : null}

        {messages.length <= 1 ? <Row style={styles.starters}>
          {STARTERS.map(prompt => <Pressable key={prompt} accessibilityRole="button" accessibilityLabel={prompt} disabled={busyComposing} onPress={() => void ask(prompt)} style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}>
            <Copy variant="caption" muted>{prompt}</Copy>
          </Pressable>)}
        </Row> : null}
        {showInstrument ? <View style={styles.instrument}>
          <JarvisDial state={coreState} size={224} />
          <Copy variant="caption" muted style={styles.instrumentHint}>Pulsa el micrófono y habla, o escribe una orden.</Copy>
        </View> : null}
      </ScrollView>

      <View style={styles.composer}>
        {notice || voice.error ? <Row style={styles.notice}>
          <Rail tone="warning" />
          <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.warning}>{notice || voice.error}</Copy>
        </Row> : null}
        {voice.speaking ? <Button label="Detener voz" variant="secondary" icon="stop" onPress={() => void voice.stop()} /> : null}
        <Row style={styles.slot}>
          <Copy variant="system" style={styles.slotLabel}>ASK</Copy>
          <TextInput ref={input} accessibilityLabel="Mensaje para JARVIS" value={draft} onChangeText={setDraft} placeholder="«organiza mi día»" placeholderTextColor={theme.colors.dim}
            multiline maxLength={1000} editable={!saving && !listening && !thinking} style={styles.slotInput} />
        </Row>
        <Row style={styles.actions}>
          <OrbButton label={listening ? "Escuchando…" : "Hablar con JARVIS"} icon="microphone" tone={listening ? "accent" : "energy"}
            disabled={listening || saving || busy || thinking} onPress={() => void listen()} />
          <View style={styles.grow} />
          <OrbButton label="Enviar" icon="arrow-up" tone={draft.trim() ? "accent" : "muted"} disabled={!draft.trim() || busyComposing} onPress={() => void ask(draft)} />
        </Row>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.ms, gap: theme.space.ms, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mark: { color: theme.colors.text, letterSpacing: 2.5 },
  gear: { width: theme.touchTarget, height: theme.touchTarget, alignItems: "flex-end", justifyContent: "center" },
  content: { padding: theme.space.md, gap: theme.space.lg, paddingBottom: theme.space.lg },
  settings: { gap: theme.space.ms, paddingBottom: theme.space.sm },
  toggle: { minHeight: theme.touchTarget, gap: theme.space.ms },
  field: {
    minHeight: theme.touchTarget, maxHeight: 120, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 22,
    paddingHorizontal: theme.space.ms, paddingVertical: theme.space.ms, borderRadius: theme.radius.control, backgroundColor: theme.colors.background,
    borderWidth: 1, borderTopColor: theme.colors.border, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  userTurn: {
    alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: theme.space.ms, paddingVertical: theme.space.sm, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.plate,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  assistantTurn: { alignItems: "stretch", gap: theme.space.ms, paddingRight: theme.space.lg },
  instrument: { alignItems: "center", gap: theme.space.md, paddingVertical: theme.space.md },
  instrumentHint: { textAlign: "center" },
  slot: {
    minHeight: theme.touchTarget, paddingHorizontal: theme.space.ms, gap: theme.space.ms, backgroundColor: theme.colors.background, borderRadius: theme.radius.pill,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  slotLabel: { color: theme.colors.dim },
  slotInput: { flex: 1, minHeight: theme.touchTarget, maxHeight: 120, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 22, paddingVertical: theme.space.ms },
  proposalHead: { gap: theme.space.sm },
  starters: { flexWrap: "wrap", gap: theme.space.sm },
  chip: { minHeight: 36, justifyContent: "center", paddingHorizontal: theme.space.ms, borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.border },
  pressed: { opacity: 0.6 },
  composer: { padding: theme.space.md, gap: theme.space.sm, borderTopWidth: 1, borderTopColor: theme.colors.edge, backgroundColor: theme.colors.surface },
  notice: { alignItems: "stretch", gap: theme.space.sm },
  actions: { gap: theme.space.sm },
  grow: { flex: 1 },
  accent: { color: theme.colors.accent },
  muted: { color: theme.colors.muted },
  warning: { color: theme.colors.warning, flex: 1 },
});
