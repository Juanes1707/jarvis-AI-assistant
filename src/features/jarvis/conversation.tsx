import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Badge, Button, Card, Copy, Icon, Row } from "../../components/ui/primitives";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { recognizeSpeech } from "../../services/voice/recognition";
import { useJarvisVoice } from "../../services/voice/use-jarvis-voice";
import { buildJarvisSystemPrompt } from "../../services/ai/context";
import { askOllama, checkOllama, type ChatMessage } from "../../services/ai/ollama";
import { theme } from "../../theme/tokens";
import { interpretCommand, type CommandProposal } from "./commands";

type Message = { id: string; role: "user" | "assistant"; text: string };
const welcome = "A tu servicio. Puedo ayudarte con tu agenda y registrar cambios. Dime qué necesitas, Juan.";
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
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; void stop(); };
  }, [stop]));

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
    if (saved) setNotice("Configuración del cerebro local guardada.");
  }
  async function testBrainConnection() {
    setNotice("Comprobando conexión con Ollama…");
    try {
      const result = await checkOllama({ url: ollamaUrl, model: ollamaModel || "qwen3.5:4b" });
      setNotice(result.installed ? "Ollama está listo y el modelo está instalado." : "Ollama responde, pero no encuentro ese modelo. Revisa el nombre con `ollama list`.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No pude comprobar Ollama."); }
  }
  const status = listening ? "ESCUCHANDO" : saving ? "GUARDANDO" : thinking ? "PENSANDO LOCALMENTE" : voice.speaking ? "JARVIS HABLANDO" : preferences.aiEnabled ? "CEREBRO LOCAL ACTIVO" : "A TU SERVICIO";
  return <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <Row><View style={[styles.orb, (listening || voice.speaking || thinking) && styles.orbActive]}><Icon name="robot-outline" size={28} /></View><View style={styles.grow}><Copy variant="heading" accessibilityRole="header">JARVIS AI</Copy><Copy variant="mono" style={styles.accent} accessibilityLiveRegion="polite">{status}</Copy></View><Button label={settings ? "Cerrar ajustes" : "Ajustes"} secondary icon="tune-variant" onPress={() => setSettings(value => !value)} /></Row>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} onContentSizeChange={() => { if (settings) scroll.current?.scrollTo({ y: 0, animated: true }); else scroll.current?.scrollToEnd({ animated: true }); }}>
        {settings && <Card>
          <Copy variant="heading">La voz de JARVIS</Copy><Copy muted>Estilo sereno, tono grave y ritmo pausado. El timbre depende de las voces instaladas en tu teléfono.</Copy>
          <Row><View style={styles.grow}><Copy>Respuestas habladas</Copy></View><Switch accessibilityLabel="Respuestas habladas" value={preferences.voiceEnabled} disabled={busy} trackColor={{ false: theme.colors.elevated, true: theme.colors.blue }} onValueChange={enabled => { if (!enabled) void voice.stop(); void setVoicePreferences({ voiceEnabled: enabled, voiceId: preferences.voiceId }); }} /></Row>
          <Button label="Probar voz" secondary icon="volume-high" onPress={() => void voice.speak("A tu servicio, Juan. Sistemas preparados. ¿Qué necesitas resolver hoy?")} />
          <Copy variant="label">VOCES EN ESPAÑOL</Copy>
          <Button label={`${preferences.voiceId === null ? "✓ " : ""}Selección automática`} secondary disabled={busy} onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: null }); }} />
          {voice.voices.map(item => <Button key={item.identifier} label={`${preferences.voiceId === item.identifier ? "✓ " : ""}${item.name} · ${item.language}`} secondary disabled={busy} onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: item.identifier }); }} />)}
          {!voice.voices.length && <Copy muted>Se usará la voz del sistema. Puedes instalar más voces en los ajustes de tu teléfono.</Copy>}
          <Copy variant="heading">Cerebro local: Ollama</Copy>
          <Copy muted>El modelo se ejecuta en tu computador. Las acciones que cambian datos siguen pidiendo tu confirmación.</Copy>
          <Row><View style={styles.grow}><Copy>Usar Ollama para conversar</Copy></View><Switch accessibilityLabel="Usar Ollama para conversar" value={preferences.aiEnabled} disabled={busy} trackColor={{ false: theme.colors.elevated, true: theme.colors.blue }} onValueChange={enabled => void setAiPreferences({ aiEnabled: enabled, ollamaUrl: ollamaUrl.trim(), ollamaModel: ollamaModel.trim() || "qwen3.5:4b" })} /></Row>
          <TextInput accessibilityLabel="Dirección de Ollama" value={ollamaUrl} onChangeText={setOllamaUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.1.20:11434" placeholderTextColor={theme.colors.muted} editable={!busy} style={styles.input} />
          <TextInput accessibilityLabel="Modelo de Ollama" value={ollamaModel} onChangeText={setOllamaModel} autoCapitalize="none" autoCorrect={false} placeholder="qwen3.5:4b" placeholderTextColor={theme.colors.muted} editable={!busy} style={styles.input} />
          <Button label="Guardar cerebro local" secondary disabled={busy} onPress={() => void saveBrainSettings()} />
          <Button label="Probar conexión" secondary icon="lan-connect" disabled={busy} onPress={() => void testBrainConnection()} />
          <Copy muted>En el celular usa la IP privada de tu computador, no `localhost`. Ambos deben estar en la misma Wi‑Fi y Ollama debe aceptar conexiones de red.</Copy>
        </Card>}
        <View style={styles.starters}><Badge>ÓRDENES Y CONSULTAS</Badge><Row style={styles.wrap}>{["Mis finanzas", "Tareas pendientes", "Agrega un gasto de 100.000 pesos hoy"].map(prompt => <Button key={prompt} label={prompt} secondary disabled={busy || saving || listening || thinking} onPress={() => void ask(prompt)} />)}</Row></View>
        {messages.map(message => <View key={message.id} style={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
          <Copy variant="label" style={message.role === "assistant" ? styles.accent : undefined}>{message.role === "user" ? "TÚ" : "JARVIS"}</Copy>
          <Copy selectable>{message.text}</Copy>
        </View>)}
        {proposal && <Card tone="accent"><Row><Icon name="clipboard-check-outline" /><Copy variant="heading">{proposal.title}</Copy></Row><Copy>{proposal.detail}</Copy><Copy muted>Se guardará al confirmar. También puedes pulsar el micrófono y decir «confirmar» o «cancelar».</Copy><Button label="Confirmar cambio" icon="check" loading={saving} disabled={busy || listening} onPress={() => void confirm()} /><Button label="Cancelar" secondary disabled={saving || busy || listening} onPress={cancel} /></Card>}
        <Copy variant="mono" muted>Órdenes locales · fecha de Bogotá · conversación de esta sesión</Copy>
      </ScrollView>
      <View style={styles.composer}>
        {!!(notice || voice.error) && <Copy accessibilityLiveRegion="polite" style={styles.warning}>{notice || voice.error}</Copy>}
        {voice.speaking && <Button label="Detener voz" secondary icon="stop" onPress={() => void voice.stop()} />}
        <TextInput ref={input} accessibilityLabel="Mensaje para JARVIS" value={draft} onChangeText={setDraft} placeholder="Escribe o dicta una orden…" placeholderTextColor={theme.colors.muted} multiline maxLength={1000} editable={!saving && !listening && !thinking} style={styles.input} />
        <Row><View style={styles.grow}><Button label={listening ? "Escuchando…" : "Hablar con JARVIS"} icon="microphone" secondary disabled={listening || saving || busy || thinking} onPress={() => void listen()} /></View><Button label="Enviar" icon="arrow-up" disabled={!draft.trim() || saving || listening || busy || thinking} onPress={() => void ask(draft)} /></Row>
        <Copy muted style={styles.hint}>{Platform.OS === "android" ? "El dictado usa el servicio de voz de Android y puede necesitar Internet." : "Dicta con el micrófono del teclado y pulsa Enviar."}</Copy>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.space.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  content: { padding: theme.space.md, gap: theme.space.md, paddingBottom: theme.space.lg },
  composer: { padding: theme.space.md, gap: theme.space.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  input: { minHeight: 48, maxHeight: 100, color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: 16, lineHeight: 24, padding: 10, borderRadius: theme.radius.control, backgroundColor: theme.colors.background },
  orb: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.accentWash, alignItems: "center", justifyContent: "center" },
  orbActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.elevated },
  grow: { flex: 1 }, wrap: { flexWrap: "wrap" }, starters: { gap: theme.space.sm },
  userMessage: { marginLeft: theme.space.xl, padding: theme.space.md, gap: theme.space.sm, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.card, borderTopRightRadius: 4 },
  assistantMessage: { marginRight: theme.space.md, padding: theme.space.md, gap: theme.space.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.card, borderTopLeftRadius: 4, backgroundColor: theme.colors.surface },
  accent: { color: theme.colors.accent }, warning: { color: theme.colors.warning }, hint: { fontSize: 12, lineHeight: 18 },
});
