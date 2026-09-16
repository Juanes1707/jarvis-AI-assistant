import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { askJarvisBackend, checkJarvisBackend, confirmJarvisBackendAction } from "../src/services/backend/client";

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
});
