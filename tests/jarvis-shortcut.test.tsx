import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { JarvisConversation } from "../src/features/jarvis/conversation";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";
import { recognizeSpeech } from "../src/services/voice/recognition";
import { checkJarvisBackend } from "../src/services/backend/client";
import { getAIProviderStatus } from "../src/services/ai/provider";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/voice/recognition", () => ({ recognizeSpeech: jest.fn() }));
jest.mock("../src/services/voice/use-jarvis-voice", () => ({ useJarvisVoice: jest.fn() }));
jest.mock("../src/services/ai/ollama", () => ({ checkOllama: jest.fn(), askOllama: jest.fn() }));
jest.mock("../src/services/ai/provider", () => ({ getAIProviderStatus: jest.fn() }));
jest.mock("../src/services/backend/client", () => ({
  askJarvisBackend: jest.fn(), checkJarvisBackend: jest.fn(), confirmJarvisBackendAction: jest.fn(),
}));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    // eslint-disable-next-line react-hooks/exhaustive-deps -- test double mimics expo-router running the effect once per focus
    useFocusEffect: (effect: () => void | (() => void)) => { useEffect(effect, []); },
    router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
  };
});
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `test-${++id}` }; });
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const speak = jest.fn<(text: string) => Promise<void>>();
const stop = jest.fn<() => Promise<void>>();

function mockWorkspace() {
  jest.mocked(useWorkspace).mockReturnValue({
    data: { user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" }, subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null },
    preferences: {
      showSuggestions: true, voiceEnabled: false, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled: false, backendUrl: "", backendToken: "",
    },
    busy: false,
    executeCommand: jest.fn(), refreshBackendWorkspace: jest.fn(),
    setVoicePreferences: jest.fn(), setAiPreferences: jest.fn(), setBackendPreferences: jest.fn(),
  } as unknown as ReturnType<typeof useWorkspace>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  speak.mockResolvedValue(); stop.mockResolvedValue();
  jest.mocked(useJarvisVoice).mockReturnValue({ speak, stop, speaking: false, voices: [], error: "" });
  jest.mocked(getAIProviderStatus).mockResolvedValue({ status: "available" });
  jest.mocked(checkJarvisBackend).mockResolvedValue({
    backend: "available", llm: "available", email: "configured", database: "available", model: "qwen3.5:4b",
  });
  jest.mocked(recognizeSpeech).mockResolvedValue(null);
  mockWorkspace();
});
afterEach(() => { jest.restoreAllMocks(); });

describe("atajo del teléfono", () => {
  it("abre el micrófono al entrar desde el atajo, sin esperar un toque", async () => {
    await render(<JarvisConversation autoListen />);
    await waitFor(() => expect(recognizeSpeech).toHaveBeenCalledTimes(1));
  });

  it("envía por sí solo lo que se dictó al llegar desde el atajo", async () => {
    jest.mocked(recognizeSpeech).mockResolvedValue("agrega un gasto de cien mil pesos hoy");
    await render(<JarvisConversation autoListen />);
    await screen.findByText("agrega un gasto de cien mil pesos hoy");
    expect(await screen.findByRole("button", { name: "Confirmar cambio" })).toBeTruthy();
  });

  it("al abrir la pestaña normalmente no activa el micrófono", async () => {
    await render(<JarvisConversation />);
    await screen.findByText("JARVIS");
    expect(recognizeSpeech).not.toHaveBeenCalled();
  });

  it("una pregunta recibida tiene prioridad y no dispara también el dictado", async () => {
    await render(<JarvisConversation initialQuestion="Tareas pendientes" autoListen />);
    await screen.findByText("Tareas pendientes");
    expect(recognizeSpeech).not.toHaveBeenCalled();
  });
});
