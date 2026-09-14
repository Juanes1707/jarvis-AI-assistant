export type ChatMessage = { role: "user" | "assistant"; content: string };
export type OllamaSettings = { url: string; model: string };

type OllamaChatResponse = { message?: { content?: unknown } };
type OllamaTagsResponse = { models?: { name?: unknown }[] };

function endpoint(url: string, path: string) {
  const normalized = url.trim().replace(/\/+$/, "");
  if (!normalized) throw new Error("Configura la dirección de Ollama antes de activar el cerebro local.");
  let parsed: URL;
  try { parsed = new URL(normalized); } catch { throw new Error("La dirección de Ollama no es válida. Usa, por ejemplo, http://192.168.1.20:11434."); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("La dirección de Ollama debe usar http o https.");
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("Usa únicamente la dirección base de Ollama, sin credenciales, ruta ni parámetros.");
  return `${normalized}${path}`;
}

async function request(url: string, init: RequestInit, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Ollama tardó demasiado en responder. Comprueba que el computador sigue encendido y vuelve a intentarlo.");
    throw new Error("No pude conectar con Ollama. Comprueba la dirección, la red Wi‑Fi y que `ollama serve` esté activo en tu computador.");
  } finally { clearTimeout(timeout); }
}

function errorForResponse(response: Response) {
  if (response.status === 404) return "No encontré el modelo indicado en Ollama. Confirma el nombre con `ollama list`.";
  return `Ollama respondió con un error (${response.status}).`;
}

export async function checkOllama(settings: OllamaSettings): Promise<{ installed: boolean }> {
  const response = await request(endpoint(settings.url, "/api/tags"), { method: "GET" }, 8000);
  if (!response.ok) throw new Error(errorForResponse(response));
  const body = await response.json() as OllamaTagsResponse;
  const installed = body.models?.some(item => item.name === settings.model) ?? false;
  return { installed };
}

export async function askOllama(settings: OllamaSettings, systemPrompt: string, messages: ChatMessage[]) {
  if (!settings.model.trim()) throw new Error("Indica el nombre del modelo de Ollama.");
  const response = await request(endpoint(settings.url, "/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model.trim(),
      stream: false,
      // Qwen 3.5 puede devolver únicamente `message.thinking` si el razonamiento está activo.
      // JARVIS necesita la respuesta final en `message.content`.
      think: false,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      options: { temperature: 0.4, num_predict: 256 },
    }),
  });
  if (!response.ok) throw new Error(errorForResponse(response));
  const body = await response.json() as OllamaChatResponse;
  const content = typeof body.message?.content === "string" ? body.message.content.trim() : "";
  if (!content) throw new Error("Ollama respondió sin texto. Inténtalo de nuevo.");
  return content.slice(0, 5000);
}
