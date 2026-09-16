import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  askJarvisBackend,
  checkJarvisBackend,
  confirmJarvisBackendAction,
  createJarvisMemory,
  forgetJarvisMemory,
  getJarvisProfile,
  listJarvisMemories,
  updateJarvisProfile,
} from "../src/services/backend/client";

const settings = { url: "http://100.64.0.10:8787", token: "a-secure-token-with-24-characters" };

afterEach(() => { jest.restoreAllMocks(); });

describe("cliente del backend multi-agente", () => {
  it("consulta el estado autenticado por la IP privada de Tailscale", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ backend: "available", llm: "available", email: "configured", database: "available", model: "qwen3.5:4b" }),
    } as Response);
    await expect(checkJarvisBackend(settings)).resolves.toMatchObject({ backend: "available", llm: "available" });
    expect(fetchMock).toHaveBeenCalledWith("http://100.64.0.10:8787/v1/agents/status", expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ Authorization: `Bearer ${settings.token}` }),
    }));
  });

  it("envía un id de petición estable y conserva propuestas sin ejecutarlas", async () => {
    const response = {
      message: "Preparé el registro.", route: "financial", tool_results: [],
      proposals: [{ id: "action-1", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "10.000 COP", status: "pending" }],
    };
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => response } as Response);
    await expect(askJarvisBackend(settings, { text: "Registra el gasto", requestId: "request-1", conversationId: "chat-1" })).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("http://100.64.0.10:8787/v1/assistant/messages", expect.objectContaining({
      body: JSON.stringify({ text: "Registra el gasto", request_id: "request-1", conversation_id: "chat-1" }),
    }));
  });

  it("confirma por un endpoint separado y expone reintentos idempotentes", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({
      proposal: { id: "action-1", tool_name: "secretary_create_task", title: "Crear tarea", detail: "Entrega", status: "confirmed" },
      result: { id: "task-1" }, replayed: true,
    }) } as Response);
    await expect(confirmJarvisBackendAction(settings, "action-1")).resolves.toMatchObject({ replayed: true });
  });

  it("rechaza URLs con credenciales y tokens demasiado cortos", async () => {
    await expect(checkJarvisBackend({ url: "http://user:secret@100.64.0.10:8787", token: settings.token })).rejects.toThrow("sin credenciales");
    await expect(checkJarvisBackend({ url: settings.url, token: "short" })).rejects.toThrow("token");
  });

  it("expone perfil y memoria reales sin inventar datos locales", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "owner", display_name: null, onboarding_completed: false }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user_id: "owner", display_name: "Juan", onboarding_completed: true }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "memory-1", kind: "preference", content: "Prefiero estudiar de noche", status: "active" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ memories: [{ id: "memory-1", content: "Prefiero estudiar de noche" }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null } as Response);

    await getJarvisProfile(settings);
    await updateJarvisProfile(settings, { display_name: "Juan", country: "Colombia", onboarding_completed: true });
    await createJarvisMemory(settings, { kind: "preference", content: "Prefiero estudiar de noche", importance: 4 });
    await listJarvisMemories(settings, { query: "estudiar" });
    await forgetJarvisMemory(settings, "memory-1");

    expect(fetchMock.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ["http://100.64.0.10:8787/v1/profile", "GET"],
      ["http://100.64.0.10:8787/v1/profile", "PATCH"],
      ["http://100.64.0.10:8787/v1/memories", "POST"],
      ["http://100.64.0.10:8787/v1/memories?query=estudiar", "GET"],
      ["http://100.64.0.10:8787/v1/memories/memory-1", "DELETE"],
    ]);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ display_name: "Juan", country: "Colombia", onboarding_completed: true }),
    }));
  });
});
