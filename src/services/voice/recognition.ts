import { Platform } from "react-native";
import { ResultCode, startActivityAsync } from "expo-intent-launcher";

export async function recognizeSpeech(): Promise<string | null> {
  if (Platform.OS !== "android") throw new Error("Toca el campo de mensaje y usa el micrófono del teclado para dictar en iPhone.");
  let result;
  try {
    result = await startActivityAsync("android.speech.action.RECOGNIZE_SPEECH", {
      extra: {
        "android.speech.extra.LANGUAGE_MODEL": "free_form",
        "android.speech.extra.LANGUAGE": "es-CO",
        "android.speech.extra.MAX_RESULTS": 1,
        "android.speech.extra.PROMPT": "Habla con JARVIS. Por ejemplo: agrega un gasto de cien mil pesos hoy.",
      },
    });
  } catch {
    throw new Error("No pude abrir el dictado de Android. Comprueba que el reconocimiento de voz esté disponible y tenga permiso de micrófono; también puedes usar el micrófono del teclado.");
  }
  if (result.resultCode === ResultCode.Canceled) return null;
  const alternatives = (result.extra as Record<string, unknown> | undefined)?.["android.speech.extra.RESULTS"];
  if (result.resultCode !== ResultCode.Success || !Array.isArray(alternatives) || typeof alternatives[0] !== "string" || !alternatives[0].trim()) {
    throw new Error("No recibí una transcripción. Intenta hablar de nuevo o escribe tu mensaje.");
  }
  return alternatives[0].trim();
}
