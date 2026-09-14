import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { askOllama, checkOllama } from "../src/services/ai/ollama";
import { buildJarvisSystemPrompt } from "../src/services/ai/context";
import { demoEvents, demoHabits, demoSubjects, demoTasks, demoTransactions } from "../src/services/storage/demo-data";

afterEach(() => { jest.restoreAllMocks(); });

describe("cliente local de Ollama", () => {
  it("envía el modelo, el contexto y el historial a la API de chat local", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ message: { content: "Respuesta local" } }) } as Response);
    await expect(askOllama({ url: "http://192.168.1.20:11434", model: "qwen3.5:4b" }, "Sistema", [{ role: "user", content: "Hola" }])).resolves.toBe("Respuesta local");
    expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.20:11434/api/chat", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ model: "qwen3.5:4b", stream: false, think: false, messages: [{ role: "system", content: "Sistema" }, { role: "user", content: "Hola" }], options: { temperature: 0.4, num_predict: 256 } }),
    }));
  });

  it("comprueba el modelo instalado sin enviar mensajes", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ models: [{ name: "qwen3.5:4b" }] }) } as Response);
    await expect(checkOllama({ url: "http://10.0.0.4:11434", model: "qwen3.5:4b" })).resolves.toEqual({ installed: true });
    expect(fetchMock).toHaveBeenCalledWith("http://10.0.0.4:11434/api/tags", expect.objectContaining({ method: "GET" }));
  });

  it("rechaza una dirección que pueda incluir credenciales o una ruta", async () => {
    await expect(checkOllama({ url: "http://user:secret@192.168.1.20:11434", model: "qwen3.5:4b" })).rejects.toThrow("sin credenciales");
  });
});

describe("contexto de JARVIS para el modelo", () => {
  it("es de solo lectura y delimita los datos del usuario", () => {
    const prompt = buildJarvisSystemPrompt({
      user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
      subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null,
    }, new Date("2026-09-12T15:00:00.000Z"));
    expect(prompt).toContain("No afirmes haber creado");
    expect(prompt).toContain("--- TAREAS PENDIENTES ---");
    expect(prompt).toContain("--- FIN DEL CONTEXTO ---");
  });
});
