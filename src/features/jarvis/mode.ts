import type { CoreState } from "../../components/jarvis/core";
import type { IconName } from "../../components/ui/primitives";
import type { Preferences } from "../../services/storage/preferences";

/**
 * Where JARVIS thinks. One selection instead of two unrelated switches, because the two engines
 * are alternatives: the distributed multi-agent server, the model on your own network, or neither.
 */
export type AssistantMode = "server" | "local" | "basic";

export function assistantMode(preferences: Pick<Preferences, "backendEnabled" | "aiEnabled">): AssistantMode {
  if (preferences.backendEnabled) return "server";
  if (preferences.aiEnabled) return "local";
  return "basic";
}

export const MODE_OPTIONS: readonly { value: AssistantMode; label: string; icon: IconName }[] = [
  { value: "server", label: "Servidor", icon: "server-network" },
  { value: "local", label: "Local", icon: "chip" },
  { value: "basic", label: "Básico", icon: "cellphone" },
];

export const MODE_DESCRIPTION: Record<AssistantMode, string> = {
  server: "Tu orden viaja por Tailscale hasta el orquestador de tu computador, que la reparte entre Secretaría y Finanzas y responde con datos reales del servidor.",
  local: "El modelo de Ollama responde desde tu red. Lo que cambia datos se guarda en este teléfono y sigue pidiendo tu confirmación.",
  basic: "JARVIS responde con lo que hay en este teléfono. Entiende órdenes como «agrega un gasto de 100.000 pesos hoy».",
};

/** Short, honest label for the header and for the system readout on other screens. */
export const MODE_LABEL: Record<AssistantMode, string> = {
  server: "Servidor JARVIS",
  local: "Cerebro local",
  basic: "Modo básico",
};

/**
 * What the core shows away from the chat: whether an assistant engine is switched on at all.
 * Live conversation states belong to the JARVIS screen, which knows what is actually in flight
 * (AI_HANDOFF SD-002).
 */
export function modeCoreState(preferences: Pick<Preferences, "backendEnabled" | "aiEnabled">): CoreState {
  return assistantMode(preferences) === "basic" ? "offline" : "idle";
}
