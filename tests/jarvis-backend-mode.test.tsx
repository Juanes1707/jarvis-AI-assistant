import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { JarvisConversation } from "../src/features/jarvis/conversation";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";
import { askJarvisBackend, checkJarvisBackend, confirmJarvisBackendAction } from "../src/services/backend/client";
import { getAIProviderStatus } from "../src/services/ai/provider";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/voice/recognition", () => ({ recognizeSpeech: jest.fn() }));
jest.mock("../src/services/voice/use-jarvis-voice", () => ({ useJarvisVoice: jest.fn() }));
jest.mock("../src/services/ai/ollama", () => ({ checkOllama: jest.fn(), askOllama: jest.fn() }));
jest.mock("../src/services/ai/provider", () => ({ getAIProviderStatus: jest.fn() }));
jest.mock("../src/services/backend/client", () => ({
  askJarvisBackend: jest.fn(),
  checkJarvisBackend: jest.fn(),
  confirmJarvisBackendAction: jest.fn(),
}));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    // eslint-disable-next-line react-hooks/exhaustive-deps -- test double mimics expo-router running the effect once per focus
    useFocusEffect: (effect: () => void | (() => void)) => { useEffect(effect, []); },
  };
});
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `test-${++id}` }; });
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const TOKEN = "un-token-de-servidor-con-mas-de-24";
const speak = jest.fn<(text: string) => Promise<void>>();
const stop = jest.fn<() => Promise<void>>();
const setBackendPreferences = jest.fn<(options: unknown) => Promise<boolean>>();
const refreshBackendWorkspace = jest.fn<() => Promise<boolean>>();

function mockWorkspace(overrides: Record<string, unknown> = {}) {
  jest.mocked(useWorkspace).mockReturnValue({
    data: { user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" }, subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null },
    preferences: {
      showSuggestions: true, voiceEnabled: false, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled: true, backendUrl: "https://equipo.tailnet.ts.net", backendToken: TOKEN,
      ...overrides,
    },
    busy: false,
    executeCommand: jest.fn(), refreshBackendWorkspace,
    setVoicePreferences: jest.fn(), setAiPreferences: jest.fn(), setBackendPreferences,
  } as unknown as ReturnType<typeof useWorkspace>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  speak.mockResolvedValue(); stop.mockResolvedValue(); setBackendPreferences.mockResolvedValue(true);
  refreshBackendWorkspace.mockResolvedValue(true);
  jest.mocked(useJarvisVoice).mockReturnValue({ speak, stop, speaking: false, voices: [], error: "" });
  jest.mocked(getAIProviderStatus).mockResolvedValue({ status: "available" });
  jest.mocked(checkJarvisBackend).mockResolvedValue({
    backend: "available", llm: "available", email: "configured", database: "available", model: "qwen3.5:4b",
  });
  mockWorkspace();
});
afterEach(() => { jest.restoreAllMocks(); });

async function send(text: string) {
  await fireEvent.changeText(screen.getByLabelText("Mensaje para JARVIS"), text);
  await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
}

describe("modo servidor multi-agente", () => {
  it("envía al agente una pregunta libre recibida desde Inicio sin fabricar una respuesta local", async () => {
    jest.mocked(askJarvisBackend).mockResolvedValue({
      message: "Respuesta generada por el orquestador.", route: "orchestrator", tool_results: [], proposals: [],
    });

    await render(<JarvisConversation initialQuestion="Analiza mis prioridades reales" />);

    await screen.findByText("Respuesta generada por el orquestador.");
    expect(askJarvisBackend).toHaveBeenCalledWith(
      { url: "https://equipo.tailnet.ts.net", token: TOKEN },
      expect.objectContaining({ text: "Analiza mis prioridades reales" }),
    );
    expect(screen.queryByText("¿Qué estudio hoy?")).toBeNull();
    expect(screen.queryByText("Organiza mi día")).toBeNull();
  });

  it("enruta la orden al backend, nombra al agente y presenta los datos que devolvió", async () => {
    jest.mocked(askJarvisBackend).mockResolvedValue({
      message: "Te quedan 420.000 pesos y tienes un correo del decano sin leer.",
      route: "composite",
      tool_results: [
        {
          name: "financial_get_summary", agent: "financial",
          data: {
            month: "2026-09", available_minor: 42000000, income_minor: 300000000, expense_minor: 258000000,
            projected_obligations_minor: 12000000, discretionary_minor: 30000000, currency: "COP",
            savings_goals: [{ id: "goal-1", name: "Fondo de emergencia", target_minor: 100000000, saved_minor: 25000000, currency: "COP", target_date: "2026-12-01" }],
          },
        },
        {
          name: "secretary_list_unread_emails", agent: "secretary",
          data: { messages: [{ id: "mail-1", sender: "decano@universidad.edu.co", subject: "Respuesta a tu solicitud", received_at: "2026-09-14T13:00:00Z", priority: "urgent" }] },
        },
      ],
      proposals: [],
    });

    await render(<JarvisConversation />);
    await send("¿Cuánto me queda y respondió el decano?");

    await screen.findByText("Te quedan 420.000 pesos y tienes un correo del decano sin leer.");
    expect(screen.getByText("SECRETARÍA Y FINANZAS")).toBeTruthy();
    expect(screen.getByText("Queda para gastar")).toBeTruthy();
    expect(screen.getByText("Fondo de emergencia")).toBeTruthy();
    expect(screen.getByText("Respuesta a tu solicitud")).toBeTruthy();
    expect(askJarvisBackend).toHaveBeenCalledWith(
      { url: "https://equipo.tailnet.ts.net", token: TOKEN },
      expect.objectContaining({ text: "¿Cuánto me queda y respondió el decano?" }),
    );
  });

  it("muestra el estado pensando mientras el backend responde", async () => {
    let release!: (value: never) => void;
    jest.mocked(askJarvisBackend).mockReturnValueOnce(new Promise(resolve => { release = resolve as never; }));
    await render(<JarvisConversation />);
    await send("Resume mi día");
    await screen.findByText("CONSULTANDO A LOS AGENTES");
    await fireEvent(screen.getByLabelText("Enviar"), "press");
    expect(askJarvisBackend).toHaveBeenCalledTimes(1);
    release({ message: "Listo.", route: "orchestrator", tool_results: [], proposals: [] } as never);
    await screen.findByText("Listo.");
  });

  it("no inventa un resultado cuando el servidor falla y reintenta con el mismo id", async () => {
    jest.mocked(askJarvisBackend)
      .mockRejectedValueOnce(new Error("No pude conectar con el servidor JARVIS. Comprueba Tailscale, la dirección y que el backend esté activo."))
      .mockResolvedValueOnce({ message: "Ya lo tengo.", route: "secretary", tool_results: [], proposals: [] });

    await render(<JarvisConversation />);
    await send("Revisa mi correo");
    await screen.findByText(/No pude conectar con el servidor JARVIS/);

    await fireEvent.press(screen.getByRole("button", { name: "Reintentar envío" }));
    await screen.findByText("Ya lo tengo.");
    const [first, second] = jest.mocked(askJarvisBackend).mock.calls;
    expect(second[1].requestId).toBe(first[1].requestId);
  });

  it("mantiene la propuesta del servidor pendiente hasta confirmarla y no la duplica al reintentar", async () => {
    jest.mocked(askJarvisBackend).mockResolvedValue({
      message: "Preparé el registro del gasto.",
      route: "financial",
      tool_results: [],
      proposals: [{ id: "action-1", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "EXPENSE 10000000 COP · Éxito", status: "pending" }],
    });
    jest.mocked(confirmJarvisBackendAction).mockResolvedValue({
      proposal: { id: "action-1", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "EXPENSE 10000000 COP · Éxito", status: "confirmed" },
      result: { id: "transaction-1" },
      replayed: true,
    });

    await render(<JarvisConversation />);
    await send("Registra un gasto de 100.000 en Éxito");

    await screen.findByText("Registrar movimiento");
    expect(confirmJarvisBackendAction).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(confirmJarvisBackendAction).toHaveBeenCalledWith({ url: "https://equipo.tailnet.ts.net", token: TOKEN }, "action-1"));
    expect(refreshBackendWorkspace).toHaveBeenCalledTimes(1);
    await screen.findByText(/ya estaba aplicada en el servidor/);
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).toBeNull();
  });

  it("muestra una nueva propuesta después de confirmar la anterior", async () => {
    jest.mocked(askJarvisBackend)
      .mockResolvedValueOnce({
        message: "Preparé el primer gasto.", route: "financial", tool_results: [],
        proposals: [{ id: "action-100", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "EXPENSE 10000 COP · Primer gasto", status: "pending" }],
      })
      .mockResolvedValueOnce({
        message: "Preparé el segundo gasto.", route: "financial", tool_results: [],
        proposals: [{ id: "action-20000", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "EXPENSE 2000000 COP · Segundo gasto", status: "pending" }],
      });
    jest.mocked(confirmJarvisBackendAction).mockResolvedValue({
      proposal: { id: "action-100", tool_name: "financial_record_transaction", title: "Registrar movimiento", detail: "EXPENSE 10000 COP · Primer gasto", status: "confirmed" },
      result: { id: "transaction-100" }, replayed: false,
    });

    await render(<JarvisConversation />);
    await send("Agrega un gasto de 100 pesos");
    await screen.findByText("EXPENSE 10000 COP · Primer gasto");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirmar cambio" })).toBeNull());

    await send("Agrega otro gasto de 20.000 pesos");

    await screen.findByText("EXPENSE 2000000 COP · Segundo gasto");
    expect(screen.getByRole("button", { name: "Confirmar cambio" })).toBeTruthy();
    expect(askJarvisBackend).toHaveBeenCalledTimes(2);
  });

  it("refleja el estado real de los agentes sin exponer el token", async () => {
    jest.mocked(checkJarvisBackend).mockResolvedValue({
      backend: "available", llm: "unavailable", email: "not_configured", database: "available",
      model: "qwen3.5:4b", detail: "Ollama no tiene el modelo instalado.",
    });

    await render(<JarvisConversation />);
    await screen.findByText("SERVIDOR SIN MODELO");

    await fireEvent.press(screen.getByRole("button", { name: "Ajustes" }));
    expect(screen.getByText("CONECTADO")).toBeTruthy();
    expect(screen.getByText("No disponible")).toBeTruthy();
    expect(screen.getByText("Sin configurar")).toBeTruthy();
    expect(screen.getByText("Ollama no tiene el modelo instalado.")).toBeTruthy();
    expect(screen.getByText("equipo.tailnet.ts.net")).toBeTruthy();
    expect(screen.queryByText(TOKEN)).toBeNull();
    expect(screen.queryByLabelText(TOKEN)).toBeNull();
  });

  it("conserva el modo local como alternativa explícita", async () => {
    mockWorkspace({ backendEnabled: false, aiEnabled: false });
    await render(<JarvisConversation />);
    await screen.findByText("A TU SERVICIO");
    await send("agrega un gasto de 100.000 pesos hoy");
    await screen.findByRole("button", { name: "Confirmar cambio" });
    expect(askJarvisBackend).not.toHaveBeenCalled();
  });
});
