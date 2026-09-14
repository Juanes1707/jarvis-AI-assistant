import { resolveDashboardCommand, type CommandContext } from "../../features/dashboard/command";
import { readPreferences } from "../storage/preferences";
import { askOllama, checkOllama, type ChatMessage, type OllamaSettings } from "./ollama";

export type CheckAIProviderInput = {
  url?: string;
  model?: string;
} | void;

export type AIProviderCheckResult =
  | { status: "available" }
  | { status: "unavailable"; reason: "disabled" | "not_configured" | "model_missing" }
  | { status: "error"; message: string };

export type AIAvailability = { status: "checking" } | AIProviderCheckResult;

export interface AIProvider {
  readonly mode: "local" | "remote";
  sendMessage(input: string, context: CommandContext): Promise<string>;
}
export const localProvider: AIProvider = {
  mode: "local",
  async sendMessage(input, context) { return resolveDashboardCommand(input, context); },
};

export function createOllamaProvider(settings: OllamaSettings, systemPrompt: string): AIProvider {
  return {
    mode: "local",
    async sendMessage(input: string, _context: CommandContext) {
      return askOllama(settings, systemPrompt, [{ role: "user", content: input } satisfies ChatMessage]);
    },
  };
}

export async function getAIProviderStatus(input?: CheckAIProviderInput): Promise<AIProviderCheckResult> {
  try {
    const preferences = await readPreferences();
    if (!preferences.aiEnabled) return { status: "unavailable", reason: "disabled" };

    const settings: OllamaSettings = {
      url: (input?.url ?? preferences.ollamaUrl).trim(),
      model: (input?.model ?? preferences.ollamaModel).trim(),
    };
    if (!settings.url || !settings.model) return { status: "unavailable", reason: "not_configured" };

    const result = await checkOllama(settings);
    return result.installed
      ? { status: "available" }
      : { status: "unavailable", reason: "model_missing" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No pude comprobar el proveedor de IA.",
    };
  }
}
