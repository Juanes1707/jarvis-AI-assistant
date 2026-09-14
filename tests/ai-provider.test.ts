import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { getAIProviderStatus } from "../src/services/ai/provider";
import { checkOllama } from "../src/services/ai/ollama";
import { readPreferences } from "../src/services/storage/preferences";

jest.mock("../src/services/ai/ollama", () => ({
  askOllama: jest.fn(),
  checkOllama: jest.fn(),
}));
jest.mock("../src/services/storage/preferences", () => ({
  readPreferences: jest.fn(),
}));

const savedPreferences = {
  showSuggestions: true,
  voiceEnabled: true,
  voiceId: null,
  aiEnabled: true,
  ollamaUrl: "http://192.168.1.20:11434",
  ollamaModel: "qwen3.5:4b",
};

afterEach(() => { jest.clearAllMocks(); });

describe("disponibilidad del proveedor de IA", () => {
  it("informa que está deshabilitado sin consultar Ollama", async () => {
    jest.mocked(readPreferences).mockResolvedValue({ ...savedPreferences, aiEnabled: false });

    await expect(getAIProviderStatus()).resolves.toEqual({ status: "unavailable", reason: "disabled" });
    expect(checkOllama).not.toHaveBeenCalled();
  });

  it.each([
    { input: { url: "" }, caseName: "dirección vacía" },
    { input: { model: "   " }, caseName: "modelo vacío" },
  ])("informa configuración ausente con $caseName", async ({ input }) => {
    jest.mocked(readPreferences).mockResolvedValue(savedPreferences);

    await expect(getAIProviderStatus(input)).resolves.toEqual({ status: "unavailable", reason: "not_configured" });
    expect(checkOllama).not.toHaveBeenCalled();
  });

  it("acepta ajustes sin guardar y distingue un modelo ausente", async () => {
    jest.mocked(readPreferences).mockResolvedValue(savedPreferences);
    jest.mocked(checkOllama).mockResolvedValue({ installed: false });

    await expect(getAIProviderStatus({ url: "http://10.0.0.4:11434", model: "llama3.2:3b" })).resolves.toEqual({ status: "unavailable", reason: "model_missing" });
    expect(checkOllama).toHaveBeenCalledWith({ url: "http://10.0.0.4:11434", model: "llama3.2:3b" });
  });

  it("informa que el proveedor está disponible", async () => {
    jest.mocked(readPreferences).mockResolvedValue(savedPreferences);
    jest.mocked(checkOllama).mockResolvedValue({ installed: true });

    await expect(getAIProviderStatus()).resolves.toEqual({ status: "available" });
  });

  it("conserva el mensaje legible de los errores de Ollama", async () => {
    jest.mocked(readPreferences).mockResolvedValue(savedPreferences);
    jest.mocked(checkOllama).mockRejectedValue(new Error("No pude conectar con Ollama."));

    await expect(getAIProviderStatus()).resolves.toEqual({ status: "error", message: "No pude conectar con Ollama." });
  });
});
