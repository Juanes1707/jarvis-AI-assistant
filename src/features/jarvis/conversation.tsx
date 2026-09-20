import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Button, Copy, Icon, Row } from "../../components/ui/primitives";
import { type AIProviderStatusValue } from "../../components/jarvis/provider-status";
import { JarvisCore, type CoreState } from "../../components/jarvis/core";
import { JarvisDial } from "../../components/jarvis/dial";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { recognizeSpeech } from "../../services/voice/recognition";
import { useJarvisVoice } from "../../services/voice/use-jarvis-voice";
import { buildJarvisSystemPrompt } from "../../services/ai/context";
import { askOllama, type ChatMessage } from "../../services/ai/ollama";
import { getAIProviderStatus } from "../../services/ai/provider";
import type { BackendActionProposal } from "../../services/backend/client";
import { theme } from "../../theme/tokens";
import { interpretCommand, type CommandProposal } from "./commands";
import { Composer, type ComposerState } from "./composer";
import { assistantMode } from "./mode";
import { PendingAction } from "./pending-action";
import { JarvisSettings } from "./settings-panel";
import { Transcript, type TranscriptMessage } from "./transcript";
import { useJarvisBackend } from "./use-jarvis-backend";

export function JarvisConversation({ initialQuestion = "", autoListen = false }: { initialQuestion?: string; autoListen?: boolean }) {
  const { data, preferences, busy, executeCommand, refreshBackendWorkspace } = useWorkspace();
  const backend = useJarvisBackend(preferences);
  const mode = assistantMode(preferences);
  const [draft, setDraft] = useState("");
  const initialMessages: TranscriptMessage[] = [];
  const [messages, setMessages] = useState<TranscriptMessage[]>(initialMessages);
  const [proposal, setProposal] = useState<CommandProposal | null>(null);
  const [serverProposals, setServerProposals] = useState<BackendActionProposal[]>([]);
  const [retry, setRetry] = useState<{ text: string; requestId: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(false);
  const [headerAvailability, setHeaderAvailability] = useState<AIProviderStatusValue | null>(null);
  const pending = useRef<CommandProposal | null>(null);
  const locked = useRef(false);
  const recognitionActive = useRef(false);
  const focused = useRef(true);
  const requestActive = useRef(false);
  const initialQuestionPending = useRef(initialQuestion.trim());
  const autoListenPending = useRef(autoListen);
  const messageHistory = useRef<TranscriptMessage[]>(initialMessages);
  const conversationId = useRef(randomUUID());
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
  const serverActive = backend.active;
  const { verify } = backend;
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (aiEnabled) void refreshHeaderAvailability();
    if (serverActive) void verify();
    return () => { focused.current = false; void stop(); };
  }, [stop, aiEnabled, serverActive, verify, refreshHeaderAvailability]));

  function append(message: Omit<TranscriptMessage, "id">) {
    messageHistory.current = [...messageHistory.current, { id: randomUUID(), ...message }].slice(-40);
    setMessages(messageHistory.current);
  }
  function answer(text: string, extra: Partial<TranscriptMessage> = {}) {
    append({ role: "assistant", text, ...extra });
    if (preferences.voiceEnabled && focused.current) void voice.speak(text);
  }

  function cancel() {
    if (locked.current) return;
    if (pending.current) {
      pending.current = null; setProposal(null);
      answer("Propuesta cancelada. No se guardó ningún cambio.");
      return;
    }
    if (serverProposals.length) {
      setServerProposals([]);
      answer("Propuesta descartada. El servidor no aplicó ningún cambio.");
      return;
    }
    answer("No hay ningún cambio pendiente.");
  }

  async function confirmDevice() {
    const action = pending.current;
    if (!action) return false;
    locked.current = true; setSaving(true); await voice.stop();
    try {
      const saved = await executeCommand(action);
      if (saved) {
        pending.current = null; setProposal(null);
        answer(`Listo. ${action.title}: ${action.detail}. El cambio está guardado en tu dispositivo.`);
      } else answer("No pude confirmar el guardado. Conservé la propuesta; puedes reintentar sin duplicar la operación.");
    } catch { answer("No pude confirmar el guardado. Puedes reintentar la misma propuesta."); }
    finally { locked.current = false; setSaving(false); }
    return true;
  }

  async function confirmServer(action: BackendActionProposal) {
    locked.current = true; setSaving(true); await voice.stop();
    try {
      const result = await backend.confirm(action.id);
      setServerProposals(current => current.filter(item => item.id !== action.id));
      await refreshBackendWorkspace();
      answer(result.replayed
        ? `${action.title} ya estaba aplicada en el servidor, así que no se duplicó.`
        : `Listo. ${action.title}: ${action.detail}. El servidor guardó el cambio.`);
    } catch (error) {
      answer(`${error instanceof Error ? error.message : "No pude confirmar el cambio en el servidor."} La propuesta sigue pendiente; reintentarla no duplica el cambio.`);
    } finally { locked.current = false; setSaving(false); }
  }

  async function confirm() {
    if (locked.current || busy) return;
    if (await confirmDevice()) return;
    const next = serverProposals[0];
    if (next) { await confirmServer(next); return; }
    answer("No hay ningún cambio pendiente de confirmar.");
  }

  async function askBackend(text: string, requestId: string) {
    requestActive.current = true; setThinking(true);
    try {
      const response = await backend.ask({ text, requestId, conversationId: conversationId.current });
      if (!focused.current) return;
      setRetry(null);
      setServerProposals(response.proposals.filter(item => item.status === "pending"));
      answer(response.message, { route: response.route, tools: response.tool_results });
    } catch (error) {
      if (!focused.current) return;
      // The same requestId is reused on retry so the server can recognise the repeat.
      setRetry({ text, requestId });
      answer(error instanceof Error ? error.message : "No pude consultar el servidor JARVIS.");
    } finally { requestActive.current = false; setThinking(false); }
  }

  async function askLocalModel() {
    requestActive.current = true; setThinking(true);
    try {
      const history: ChatMessage[] = messageHistory.current.slice(-12).map(message => ({ role: message.role, content: message.text }));
      const response = await askOllama({ url: preferences.ollamaUrl, model: preferences.ollamaModel }, buildJarvisSystemPrompt(data, new Date()), history);
      if (focused.current) answer(response);
    } catch (error) {
      if (focused.current) answer(error instanceof Error ? error.message : "No pude consultar el cerebro local.");
    } finally { requestActive.current = false; setThinking(false); }
  }

  async function ask(value: string, dictated = false) {
    if (!value.trim() || locked.current || busy || requestActive.current) return;
    const text = value.trim();
    append({ role: "user", text, dictated });
    setDraft(""); setNotice("");

    // The local engine also recognises «confirmar» and «cancelar», which stay meaningful in
    // every mode because they act on whatever proposal is currently on screen.
    const result = interpretCommand(text, data, new Date(), randomUUID());
    if (result.kind === "confirm") { await confirm(); return; }
    if (result.kind === "cancel") { cancel(); return; }
    if (pending.current || serverProposals.length) {
      answer("Primero confirma o cancela la propuesta pendiente. Puedes decir «confirmar» o «cancelar». Después dime la nueva orden.");
      return;
    }
    if (serverActive) { await askBackend(text, randomUUID()); return; }
    if (aiEnabled) { await askLocalModel(); return; }
    if (result.kind === "proposal") {
      pending.current = result.proposal; setProposal(result.proposal);
      answer(`Voy a ${result.proposal.title.toLocaleLowerCase("es")}: ${result.proposal.detail}. Revisa los datos y di «confirmar» o «cancelar».`);
      return;
    }
    if (result.kind !== "reply") return;
    answer(result.message);
  }

  useEffect(() => {
    const question = initialQuestionPending.current;
    if (question) {
      initialQuestionPending.current = "";
      void ask(question);
      return;
    }
    // Arriving from the phone shortcut: open the microphone instead of waiting for a tap.
    if (autoListenPending.current) {
      autoListenPending.current = false;
      void listen();
    }
    // The route key remounts this screen for each entry; the refs prevent duplicate triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function listen() {
    if (recognitionActive.current || locked.current || busy) return;
    if (Platform.OS !== "android") {
      input.current?.focus();
      setNotice("Usa el micrófono del teclado de tu iPhone para dictar y pulsa Enviar.");
      return;
    }
    recognitionActive.current = true; setListening(true); setNotice("");
    await voice.stop();
    try {
      const transcript = await recognizeSpeech();
      if (focused.current && transcript) void ask(transcript, true);
    } catch (error) {
      if (focused.current) setNotice(error instanceof Error ? error.message : "No pude escuchar. Inténtalo de nuevo.");
    } finally { recognitionActive.current = false; setListening(false); }
  }

  const brainDown = mode === "server"
    ? backend.state === "failed" || backend.report?.llm === "unavailable" || backend.report?.llm === "error"
    : mode === "local" ? headerAvailability === "unavailable" || headerAvailability === "error" : true;
  const modeLabel = mode === "server"
    ? backend.state === "checking" ? "COMPROBANDO EL SERVIDOR"
      // Reachable but without a model is a real, distinct state: the agents answer, the LLM does not.
      : backend.state === "online" ? backend.report?.llm === "available" ? "SERVIDOR JARVIS ACTIVO" : "SERVIDOR SIN MODELO"
      : backend.state === "failed" ? "SERVIDOR SIN CONEXIÓN"
      : "SERVIDOR SIN COMPROBAR"
    : mode === "local"
      ? headerAvailability === "checking" ? "COMPROBANDO CEREBRO LOCAL"
        : headerAvailability === "unavailable" || headerAvailability === "error" ? "CEREBRO LOCAL SIN CONEXIÓN"
        : "CEREBRO LOCAL ACTIVO"
      : "A TU SERVICIO";
  const thinkingLabel = mode === "server" ? "CONSULTANDO A LOS AGENTES" : mode === "local" ? "PENSANDO LOCALMENTE" : "PENSANDO";
  const status = listening ? "ESCUCHANDO" : saving ? "GUARDANDO" : thinking ? thinkingLabel : voice.speaking ? "JARVIS HABLANDO" : modeLabel;
  const live = listening || saving || thinking || voice.speaking;
  const coreState: CoreState = listening ? "listening" : saving || thinking ? "thinking" : voice.speaking ? "speaking" : brainDown ? "offline" : "idle";
  const composerState: ComposerState = listening ? "listening" : saving || busy ? "saving" : thinking ? "thinking" : voice.speaking ? "speaking" : "idle";
  // The instrument is the empty state: it introduces JARVIS, then yields the space to the conversation.
  const showInstrument = messages.length === 0 && !settings && !proposal && !serverProposals.length;

  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Row style={styles.header}>
        <JarvisCore state={coreState} size={38} />
        <View style={styles.grow}>
          <Copy variant="marker" style={styles.mark}>JARVIS</Copy>
          <Copy variant="system" accessibilityLiveRegion="polite" style={live ? styles.accent : styles.muted}>{status}</Copy>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={settings ? "Cerrar ajustes" : "Ajustes"} hitSlop={10}
          onPress={() => setSettings(value => !value)} style={styles.gear}>
          <Icon name={settings ? "close" : "tune-variant"} size={20} color={theme.colors.muted} />
        </Pressable>
      </Row>

      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        onContentSizeChange={() => { if (settings) scroll.current?.scrollTo({ y: 0, animated: true }); else scroll.current?.scrollToEnd({ animated: true }); }}>
        {settings ? <JarvisSettings backend={backend} voice={voice} onNotice={setNotice} /> : null}

        <Transcript messages={messages} offline={brainDown} />

        {proposal ? <PendingAction title={proposal.title} detail={proposal.detail} origin="device"
          saving={saving} disabled={busy || listening} onConfirm={() => void confirm()} onCancel={cancel} /> : null}

        {serverProposals.map(item => <PendingAction key={item.id} title={item.title} detail={item.detail} origin="server"
          saving={saving} disabled={busy || listening} onConfirm={() => void confirmServer(item)} onCancel={cancel} />)}

        {retry ? <Row style={styles.retry}>
          <View style={styles.grow}><Copy variant="caption" muted>El servidor no respondió. Reintentar no duplica ningún cambio.</Copy></View>
          <Button label="Reintentar envío" variant="secondary" icon="refresh" disabled={thinking || busy}
            onPress={() => void askBackend(retry.text, retry.requestId)} />
        </Row> : null}

        {showInstrument ? <View style={styles.instrument}>
          <JarvisDial state={coreState} size={224} />
          <Copy variant="caption" muted style={styles.instrumentHint}>Pulsa el micrófono y habla, o escribe una orden.</Copy>
        </View> : null}
      </ScrollView>

      <Composer state={composerState} draft={draft} notice={notice || voice.error} inputRef={input}
        onDraftChange={setDraft} onSend={() => void ask(draft)} onListen={() => void listen()} onStopSpeaking={() => void voice.stop()} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.ms, gap: theme.space.ms, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mark: { color: theme.colors.text, letterSpacing: 2.5 },
  gear: { width: theme.touchTarget, height: theme.touchTarget, alignItems: "flex-end", justifyContent: "center" },
  content: { padding: theme.space.md, gap: theme.space.lg, paddingBottom: theme.space.lg },
  instrument: { alignItems: "center", gap: theme.space.md, paddingVertical: theme.space.md },
  instrumentHint: { textAlign: "center" },
  retry: { gap: theme.space.ms, flexWrap: "wrap" },
  grow: { flex: 1 },
  accent: { color: theme.colors.accent },
  muted: { color: theme.colors.muted },
});
