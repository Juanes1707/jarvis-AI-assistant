export type BackendSettings = { url: string; token: string };
export type BackendRoute = "orchestrator" | "secretary" | "financial" | "composite";
/** Shape of `GET /v1/agents/status`; named so the UI can type its status surface (X2C-001). */
export type BackendStatus = {
  backend: "available";
  llm: "available" | "unavailable" | "error";
  email: "configured" | "not_configured";
  database: "available";
  model: string;
  detail?: string;
};
export type BackendToolResult = { name: string; agent: BackendRoute; data: Record<string, unknown> };
export type BackendActionProposal = {
  id: string;
  tool_name: string;
  title: string;
  detail: string;
  status: "pending" | "confirmed" | "cancelled";
};
export type BackendAssistantResponse = {
  message: string;
  route: BackendRoute;
  tool_results: BackendToolResult[];
  proposals: BackendActionProposal[];
};
export type BackendConfirmation = {
  proposal: BackendActionProposal;
  result: Record<string, unknown>;
  replayed: boolean;
};
export type BackendUserProfile = {
  user_id: string;
  display_name?: string | null;
  preferred_name?: string | null;
  timezone?: string | null;
  locale?: string | null;
  country?: string | null;
  city?: string | null;
  occupation?: string | null;
  study_program?: string | null;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
};
export type BackendProfileUpdate = Partial<Pick<
  BackendUserProfile,
  "display_name" | "preferred_name" | "timezone" | "locale" | "country" | "city" |
  "occupation" | "study_program" | "onboarding_completed"
>>;
export type BackendMemoryKind = "preference" | "fact" | "goal" | "constraint";
export type BackendMemory = {
  id: string;
  user_id?: string;
  kind: BackendMemoryKind;
  content: string;
  source?: "manual" | "conversation" | "import";
  importance?: number;
  status: "active" | "forgotten";
  expires_at?: string | null;
  confirmed_at?: string;
  forgotten_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type BackendMemoryCreate = {
  kind: BackendMemoryKind;
  content: string;
  importance?: number;
  expires_at?: string | null;
};
export type BackendWorkspace = {
  subjects: {
    id: string; name: string; professor?: string | null; credits: number; active: boolean;
    created_at: string; updated_at: string;
  }[];
  tasks: {
    id: string; title: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    priority: "LOW" | "MEDIUM" | "HIGH"; due_at?: string | null;
    subject_id?: string | null; subject_name?: string | null;
  }[];
  events: {
    id: string; title: string; starts_at: string; ends_at: string;
    event_type: "CLASS" | "STUDY" | "EXAM" | "PERSONAL" | "DEADLINE" | "OTHER";
    location?: string | null; confirmed: boolean; subject_id?: string | null; subject_name?: string | null;
  }[];
  transactions: {
    id: string; type: "INCOME" | "EXPENSE"; amount_minor: number; currency: string;
    merchant: string; category: string; payment_method?: string | null;
    occurred_at: string; source: "manual" | "voice" | "bank_webhook"; created_at: string;
  }[];
  budget: {
    id: string; month: string; amount_minor: number; currency: string;
    created_at: string; updated_at: string;
  } | null;
};

function endpoint(settings: BackendSettings, path: string) {
  const normalized = settings.url.trim().replace(/\/+$/, "");
  if (!normalized) throw new Error("Configura la dirección del servidor JARVIS.");
  let parsed: URL;
  try { parsed = new URL(normalized); } catch { throw new Error("La dirección del servidor JARVIS no es válida."); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("El servidor JARVIS debe usar http o https.");
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Usa únicamente la dirección base del servidor JARVIS, sin credenciales, ruta ni parámetros.");
  }
  if (settings.token.trim().length < 24) throw new Error("Configura el token del servidor JARVIS.");
  return `${normalized}${path}`;
}

function isPrivateHostResolutionFailure(error: Error): boolean {
  return /UnknownHostException|Unable to resolve host|ENOTFOUND/i.test(error.message);
}

async function request<T>(settings: BackendSettings, path: string, init: RequestInit, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint(settings, path), {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${settings.token.trim()}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null) as { detail?: unknown } | null;
    if (!response.ok) {
      const detail = typeof body?.detail === "string" ? body.detail : `El servidor JARVIS respondió con un error (${response.status}).`;
      throw new Error(detail);
    }
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("El servidor JARVIS tardó demasiado en responder.");
    if (error instanceof Error && isPrivateHostResolutionFailure(error)) {
      throw new Error("Tailscale no puede resolver la dirección privada de JARVIS. Abre Tailscale en este teléfono, inicia sesión en la misma tailnet y vuelve a probar.");
    }
    if (error instanceof Error && !/^Network request failed$/.test(error.message)) throw error;
    throw new Error("No pude conectar con el servidor JARVIS. Comprueba Tailscale, la dirección y que el backend esté activo.");
  } finally { clearTimeout(timeout); }
}

export async function checkJarvisBackend(settings: BackendSettings): Promise<BackendStatus> {
  return request<BackendStatus>(settings, "/v1/agents/status", { method: "GET" }, 8_000);
}

export async function askJarvisBackend(
  settings: BackendSettings,
  input: { text: string; requestId: string; conversationId?: string },
) {
  return request<BackendAssistantResponse>(settings, "/v1/assistant/messages", {
    method: "POST",
    body: JSON.stringify({ text: input.text, request_id: input.requestId, conversation_id: input.conversationId }),
  });
}

export async function confirmJarvisBackendAction(settings: BackendSettings, actionId: string) {
  return request<BackendConfirmation>(settings, `/v1/actions/${encodeURIComponent(actionId)}/confirm`, {
    method: "POST",
  });
}

export async function getJarvisProfile(settings: BackendSettings) {
  return request<BackendUserProfile>(settings, "/v1/profile", { method: "GET" });
}

export async function getJarvisWorkspace(settings: BackendSettings, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("El mes solicitado no es válido.");
  return request<BackendWorkspace>(
    settings, `/v1/workspace?month=${encodeURIComponent(month)}`, { method: "GET" },
  );
}

export async function updateJarvisProfile(settings: BackendSettings, update: BackendProfileUpdate) {
  return request<BackendUserProfile>(settings, "/v1/profile", {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function listJarvisMemories(
  settings: BackendSettings,
  filters: { query?: string; kind?: BackendMemoryKind; limit?: number } = {},
) {
  const parameters: string[] = [];
  if (filters.query?.trim()) parameters.push(`query=${encodeURIComponent(filters.query.trim())}`);
  if (filters.kind) parameters.push(`kind=${encodeURIComponent(filters.kind)}`);
  if (filters.limit !== undefined) parameters.push(`limit=${encodeURIComponent(String(filters.limit))}`);
  const suffix = parameters.length ? `?${parameters.join("&")}` : "";
  return request<{ memories: BackendMemory[] }>(settings, `/v1/memories${suffix}`, { method: "GET" });
}

export async function createJarvisMemory(settings: BackendSettings, memory: BackendMemoryCreate) {
  return request<BackendMemory>(settings, "/v1/memories", {
    method: "POST",
    body: JSON.stringify(memory),
  });
}

export async function forgetJarvisMemory(settings: BackendSettings, memoryId: string) {
  return request<void>(settings, `/v1/memories/${encodeURIComponent(memoryId)}`, { method: "DELETE" });
}
