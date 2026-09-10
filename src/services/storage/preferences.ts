import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
const schema = z.object({ showSuggestions: z.boolean() });
export type Preferences = z.infer<typeof schema>;
const key = "jarvis:preferences:v1";
export async function readPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { showSuggestions: true };
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("No se pudieron leer las preferencias guardadas.");
  return parsed.data;
}
export async function savePreferences(preferences: Preferences) {
  await AsyncStorage.setItem(key, JSON.stringify(schema.parse(preferences)));
}
