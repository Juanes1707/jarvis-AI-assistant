import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { JarvisConversation } from "../src/features/jarvis/conversation";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";
import { askOllama, checkOllama } from "../src/services/ai/ollama";
import { getAIProviderStatus } from "../src/services/ai/provider";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/voice/recognition", () => ({ recognizeSpeech: jest.fn() }));
jest.mock("../src/services/voice/use-jarvis-voice", () => ({ useJarvisVoice: jest.fn() }));
jest.mock("../src/services/ai/ollama", () => ({ checkOllama: jest.fn(), askOllama: jest.fn() }));
jest.mock("../src/services/ai/provider", () => ({ getAIProviderStatus: jest.fn() }));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- test double mimics expo-router running the effect once per focus
      useEffect(effect, []);
    },
  };
});
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `test-${++id}` }; });
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const speak = jest.fn<(text: string) => Promise<void>>();
const stop = jest.fn<() => Promise<void>>();

function mockWorkspace(overrides: Partial<{ aiEnabled: boolean }> = {}) {
  jest.mocked(useWorkspace).mockReturnValue({
    data: { user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" }, subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null },
    preferences: { showSuggestions: true, voiceEnabled: true, voiceId: null, aiEnabled: true, ollamaUrl: "http://192.168.1.20:11434", ollamaModel: "qwen3.5:4b", ...overrides },
    busy: false,
    executeCommand: jest.fn(), setVoicePreferences: jest.fn(), setAiPreferences: jest.fn(),
  } as unknown as ReturnType<typeof useWorkspace>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  speak.mockResolvedValue(); stop.mockResolvedValue();
  jest.mocked(useJarvisVoice).mockReturnValue({ speak, stop, speaking: false, voices: [], error: "" });
  jest.mocked(getAIProviderStatus).mockResolvedValue({ status: "available" });
  mockWorkspace();
});
afterEach(() => { jest.restoreAllMocks(); });

async function openSettings() {
  await render(<JarvisConversation />);
  await fireEvent.press(screen.getByRole("button", { name: "Ajustes" }));
}

describe("estado del proveedor de IA en ajustes", () => {
  it("muestra disponible cuando Ollama responde con el modelo instalado", async () => {
    jest.mocked(checkOllama).mockResolvedValueOnce({ installed: true });
    await openSettings();
    await fireEvent.press(screen.getByRole("button", { name: "Probar conexión" }));
    await screen.findByText("DISPONIBLE");
    expect(screen.getByText(/está listo y el modelo está instalado/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Probar conexión" })).toBeNull();
  });

  it("muestra no disponible con opción de reintentar cuando falta el modelo", async () => {
    jest.mocked(checkOllama).mockResolvedValueOnce({ installed: false });
    await openSettings();
    await fireEvent.press(screen.getByRole("button", { name: "Probar conexión" }));
    await screen.findByText("NO DISPONIBLE");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("muestra error con el mensaje real y permite reintentar hasta quedar disponible", async () => {
    jest.mocked(checkOllama).mockRejectedValueOnce(new Error("No pude conectar con Ollama."));
    await openSettings();
    await fireEvent.press(screen.getByRole("button", { name: "Probar conexión" }));
    await screen.findByText("ERROR");
    expect(screen.getByText("No pude conectar con Ollama.")).toBeTruthy();
    jest.mocked(checkOllama).mockResolvedValueOnce({ installed: true });
    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Reintentar" })); });
    await screen.findByText("DISPONIBLE");
    expect(checkOllama).toHaveBeenCalledTimes(2);
  });
});

describe("estado del proveedor de IA en el encabezado", () => {
  it("envía al modelo incluso las órdenes que antes interceptaba el motor de reglas", async () => {
    jest.mocked(askOllama).mockResolvedValueOnce("Respuesta razonada por el modelo.");
    await render(<JarvisConversation />);

    await fireEvent.changeText(screen.getByLabelText("Mensaje para JARVIS"), "Agrega un gasto de 100.000 pesos hoy");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));

    await screen.findByText("Respuesta razonada por el modelo.");
    expect(askOllama).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).toBeNull();
  });

  it("consulta el proveedor real al enfocar la pantalla y refleja disponibilidad real", async () => {
    jest.mocked(getAIProviderStatus).mockResolvedValueOnce({ status: "available" });
    await render(<JarvisConversation />);
    await screen.findByText("CEREBRO LOCAL ACTIVO");
    expect(getAIProviderStatus).toHaveBeenCalledTimes(1);
  });

  it("muestra sin conexión en el encabezado cuando el proveedor real no está disponible", async () => {
    jest.mocked(getAIProviderStatus).mockResolvedValueOnce({ status: "unavailable", reason: "model_missing" });
    await render(<JarvisConversation />);
    await screen.findByText("CEREBRO LOCAL SIN CONEXIÓN");
  });

  it("muestra error en el encabezado cuando la comprobación real falla", async () => {
    jest.mocked(getAIProviderStatus).mockResolvedValueOnce({ status: "error", message: "No pude conectar con Ollama." });
    await render(<JarvisConversation />);
    await screen.findByText("CEREBRO LOCAL SIN CONEXIÓN");
  });

  it("no consulta al proveedor real cuando el cerebro local está desactivado", async () => {
    mockWorkspace({ aiEnabled: false });
    await render(<JarvisConversation />);
    await screen.findByText("A TU SERVICIO");
    expect(getAIProviderStatus).not.toHaveBeenCalled();
  });
});
