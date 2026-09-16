import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
const schema = z.object({
  showSuggestions: z.boolean(),
  voiceEnabled: z.boolean().default(true),
  voiceId: z.string().nullable().default(null),
  aiEnabled: z.boolean().default(false),
  ollamaUrl: z.string().trim().max(256).default(""),
  ollamaModel: z.string().trim().min(1).max(128).default("qwen3.5:4b"),
  // Self-hosted multi-agent backend reached over Tailscale (AI_HANDOFF X2C-001 / SD-004).
  backendEnabled: z.boolean().default(false),
  backendUrl: z.string().trim().max(256).default(""),
  backendToken: z.string().trim().max(256).default(""),
});
export type Preferences = z.infer<typeof schema>;
export const defaultPreferences: Preferences = {
  showSuggestions: true,
  voiceEnabled: true,
  voiceId: null,
  aiEnabled: false,
  ollamaUrl: "",
  ollamaModel: "qwen3.5:4b",
  backendEnabled: false,
  backendUrl: "",
  backendToken: "",
};
const key = "jarvis:preferences:v1";
export async function readPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { ...defaultPreferences };
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("No se pudieron leer las preferencias guardadas.");
  return parsed.data;
}
export async function savePreferences(preferences: Preferences) {
  await AsyncStorage.setItem(key, JSON.stringify(schema.parse(preferences)));
}
