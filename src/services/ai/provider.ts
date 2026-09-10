import { resolveDashboardCommand, type CommandContext } from "../../features/dashboard/command";
export interface AIProvider {
  readonly mode: "local" | "remote";
  sendMessage(input: string, context: CommandContext): Promise<string>;
}
export const localProvider: AIProvider = {
  mode: "local",
  async sendMessage(input, context) { return resolveDashboardCommand(input, context); },
};
