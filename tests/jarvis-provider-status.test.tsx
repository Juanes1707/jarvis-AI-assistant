import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { JarvisConversation } from "../src/features/jarvis/conversation";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";
import { checkOllama } from "../src/services/ai/ollama";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/voice/recognition", () => ({ recognizeSpeech: jest.fn() }));
jest.mock("../src/services/voice/use-jarvis-voice", () => ({ useJarvisVoice: jest.fn() }));
jest.mock("../src/services/ai/ollama", () => ({ checkOllama: jest.fn(), askOllama: jest.fn() }));
jest.mock("expo-router", () => ({ useFocusEffect: () => {} }));
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `test-${++id}` }; });
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const speak = jest.fn<(text: string) => Promise<void>>();
const stop = jest.fn<() => Promise<void>>();

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  speak.mockResolvedValue(); stop.mockResolvedValue();
  jest.mocked(useJarvisVoice).mockReturnValue({ speak, stop, speaking: false, voices: [], error: "" });
  jest.mocked(useWorkspace).mockReturnValue({
    data: { user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" }, subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null },
    preferences: { showSuggestions: true, voiceEnabled: true, voiceId: null, aiEnabled: true, ollamaUrl: "http://192.168.1.20:11434", ollamaModel: "qwen3.5:4b" }, busy: false,
    executeCommand: jest.fn(), setVoicePreferences: jest.fn(), setAiPreferences: jest.fn(),
  } as unknown as ReturnType<typeof useWorkspace>);
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
