import { useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Button, Copy, Field, Icon, OptionRow, Row, Section, Segmented } from "../../components/ui/primitives";
import { AIProviderStatus, type AIProviderStatusValue } from "../../components/jarvis/provider-status";
import { BackendStatusPanel } from "../../components/jarvis/backend-status";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { checkOllama } from "../../services/ai/ollama";
import type { useJarvisVoice } from "../../services/voice/use-jarvis-voice";
import { theme } from "../../theme/tokens";
import { assistantMode, MODE_DESCRIPTION, MODE_OPTIONS, type AssistantMode } from "./mode";
import type { JarvisBackend } from "./use-jarvis-backend";

const DEFAULT_MODEL = "qwen3.5:4b";

/**
 * Everything the user can configure about the assistant, in the order the architecture runs:
 * where it thinks, how it gets there, and how it sounds.
 */
export function JarvisSettings({ backend, voice, onNotice }: {
  backend: JarvisBackend;
  voice: ReturnType<typeof useJarvisVoice>;
  onNotice: (message: string) => void;
}) {
  const { preferences, busy, setVoicePreferences, setAiPreferences, setBackendPreferences } = useWorkspace();
  const mode = assistantMode(preferences);

  const [backendUrl, setBackendUrl] = useState(preferences.backendUrl ?? "");
  const [backendToken, setBackendToken] = useState(preferences.backendToken ?? "");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(preferences.ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(preferences.ollamaModel);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatusValue | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | undefined>(undefined);

  async function changeMode(next: AssistantMode) {
    if (next === mode) return;
    // Both engines are written, never just one, so the two flags can never disagree about the mode.
    await setAiPreferences({ aiEnabled: next === "local", ollamaUrl: ollamaUrl.trim(), ollamaModel: ollamaModel.trim() || DEFAULT_MODEL });
    await setBackendPreferences({ backendEnabled: next === "server", backendUrl: backendUrl.trim(), backendToken: backendToken.trim() });
    if (next === "server" && backendUrl.trim() && backendToken.trim().length >= 24) {
      void backend.verify({ url: backendUrl.trim(), token: backendToken.trim() });
    }
  }

  async function saveServer() {
    const url = backendUrl.trim();
    const token = backendToken.trim();
    const saved = await setBackendPreferences({ backendEnabled: preferences.backendEnabled ?? false, backendUrl: url, backendToken: token });
    if (!saved) return;
    onNotice("Servidor guardado en este teléfono.");
    if (url && token.length >= 24) void backend.verify({ url, token });
  }

  async function saveBrain() {
    const saved = await setAiPreferences({ aiEnabled: preferences.aiEnabled, ollamaUrl: ollamaUrl.trim(), ollamaModel: ollamaModel.trim() || DEFAULT_MODEL });
    if (saved) onNotice("Cerebro local guardado.");
  }

  async function testBrain() {
    setProviderStatus("checking"); setProviderMessage(undefined);
    try {
      const result = await checkOllama({ url: ollamaUrl, model: ollamaModel || DEFAULT_MODEL });
      if (result.installed) { setProviderStatus("available"); setProviderMessage("Ollama está listo y el modelo está instalado."); }
      else { setProviderStatus("unavailable"); setProviderMessage("Ollama responde, pero no encuentro ese modelo. Revisa el nombre con `ollama list`."); }
    } catch (error) {
      setProviderStatus("error");
      setProviderMessage(error instanceof Error ? error.message : "No pude comprobar Ollama.");
    }
  }

  return <View style={styles.panel}>
    <Section label="MODO">
      <Segmented label="Modo del asistente" value={mode} options={MODE_OPTIONS} disabled={busy} onChange={next => void changeMode(next)} />
      <Copy variant="caption" muted accessibilityLiveRegion="polite">{MODE_DESCRIPTION[mode]}</Copy>
    </Section>

    <Section label="SERVIDOR JARVIS">
      <Copy variant="caption" muted>
        Usa la dirección HTTPS que imprime `tailscale serve`. El token se guarda solo en este teléfono, nunca se envía a otro servicio y nunca aparece en la conversación.
      </Copy>
      <Field label="DIRECCIÓN" value={backendUrl} onChangeText={setBackendUrl} autoCapitalize="none" autoCorrect={false}
        keyboardType="url" placeholder="https://equipo.tailnet.ts.net" editable={!busy}
        hint="Solo la dirección base, sin rutas ni parámetros." />
      <Field label="TOKEN DE ACCESO" value={backendToken} onChangeText={setBackendToken} autoCapitalize="none" autoCorrect={false}
        secureTextEntry={!tokenVisible} placeholder="Pega aquí el token del servidor" editable={!busy}
        hint="Mínimo 24 caracteres. Es distinto del token del webhook bancario."
        trailing={<Pressable accessibilityRole="button" accessibilityLabel={tokenVisible ? "Ocultar el token" : "Mostrar el token"} hitSlop={8}
          onPress={() => setTokenVisible(value => !value)} style={styles.reveal}>
          <Icon name={tokenVisible ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.muted} />
        </Pressable>} />
      <Button label="Guardar servidor" variant="secondary" icon="content-save-outline" disabled={busy} onPress={() => void saveServer()} />
      <BackendStatusPanel state={backend.state} report={backend.report} error={backend.error} host={backend.host}
        onRetry={() => void backend.verify({ url: backendUrl.trim(), token: backendToken.trim() })} />
    </Section>

    <Section label="CEREBRO LOCAL">
      <Copy variant="caption" muted>
        Ollama corre en tu computador. Desde el celular usa su IP privada, no `localhost`, y asegúrate de que acepte conexiones de tu red.
      </Copy>
      <Field label="DIRECCIÓN" value={ollamaUrl} onChangeText={setOllamaUrl} autoCapitalize="none" autoCorrect={false}
        keyboardType="url" placeholder="http://192.168.1.20:11434" editable={!busy} />
      <Field label="MODELO" value={ollamaModel} onChangeText={setOllamaModel} autoCapitalize="none" autoCorrect={false}
        placeholder={DEFAULT_MODEL} editable={!busy} />
      <Button label="Guardar cerebro local" variant="secondary" icon="content-save-outline" disabled={busy} onPress={() => void saveBrain()} />
      {providerStatus === null
        ? <Button label="Probar conexión" variant="secondary" icon="lan-connect" disabled={busy} onPress={() => void testBrain()} />
        : <AIProviderStatus status={providerStatus} message={providerMessage} retrying={providerStatus === "checking"} onRetry={() => void testBrain()} />}
    </Section>

    <Section label="VOZ">
      <Copy variant="caption" muted>Tono grave y ritmo pausado. El timbre depende de las voces en español instaladas en tu teléfono.</Copy>
      <Row style={styles.toggle}>
        <Copy variant="body" style={styles.grow}>Respuestas habladas</Copy>
        <Switch accessibilityLabel="Respuestas habladas" value={preferences.voiceEnabled} disabled={busy}
          trackColor={{ false: theme.colors.elevated, true: theme.colors.accentSoft }}
          thumbColor={preferences.voiceEnabled ? theme.colors.accent : theme.colors.muted}
          onValueChange={enabled => { if (!enabled) void voice.stop(); void setVoicePreferences({ voiceEnabled: enabled, voiceId: preferences.voiceId }); }} />
      </Row>
      <Button label="Probar voz" variant="secondary" icon="volume-high"
        onPress={() => void voice.speak("A tu servicio, Juan. Sistemas preparados. ¿Qué necesitas resolver hoy?")} />
      <View style={styles.voices}>
        <OptionRow label="Selección automática" note="La mejor voz en español que encuentre este teléfono"
          selected={preferences.voiceId === null} disabled={busy}
          onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: null }); }} />
        {voice.voices.map(item => <OptionRow key={item.identifier} label={item.name} note={item.language}
          selected={preferences.voiceId === item.identifier} disabled={busy}
          onPress={() => { void voice.stop(); void setVoicePreferences({ voiceEnabled: preferences.voiceEnabled, voiceId: item.identifier }); }} />)}
      </View>
      {voice.voices.length ? null : <Copy variant="caption" muted>Se usará la voz del sistema. Puedes instalar más voces desde los ajustes de tu teléfono.</Copy>}
    </Section>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: theme.space.lg, paddingBottom: theme.space.sm },
  reveal: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  toggle: { minHeight: theme.touchTarget, gap: theme.space.ms },
  voices: { paddingTop: theme.space.xs },
  grow: { flex: 1 },
});
