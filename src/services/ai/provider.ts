import { resolveDashboardCommand, type CommandContext } from "../../features/dashboard/command";
import { askOllama, type ChatMessage, type OllamaSettings } from "./ollama";
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
