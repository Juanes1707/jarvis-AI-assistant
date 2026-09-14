import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { JarvisConversation } from "../src/features/jarvis/conversation";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { recognizeSpeech } from "../src/services/voice/recognition";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/voice/recognition", () => ({ recognizeSpeech: jest.fn() }));
jest.mock("../src/services/voice/use-jarvis-voice", () => ({ useJarvisVoice: jest.fn() }));
jest.mock("expo-router", () => ({ useFocusEffect: () => {} }));
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `test-${++id}` }; });
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});
const execute = jest.fn<ReturnType<typeof useWorkspace>["executeCommand"]>();
const speak = jest.fn<(text: string) => Promise<void>>();
const stop = jest.fn<() => Promise<void>>();
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  execute.mockResolvedValue(true); speak.mockResolvedValue(); stop.mockResolvedValue();
  jest.mocked(useJarvisVoice).mockReturnValue({ speak, stop, speaking: false, voices: [], error: "" });
  jest.mocked(useWorkspace).mockReturnValue({
    data: { user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" }, subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [], budget: null },
    preferences: { showSuggestions: true, voiceEnabled: true, voiceId: null, aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b" }, busy: false,
    executeCommand: execute, setVoicePreferences: jest.fn(), setAiPreferences: jest.fn(),
  } as unknown as ReturnType<typeof useWorkspace>);
});
afterEach(() => { jest.restoreAllMocks(); });
async function send(text: string) {
  await fireEvent.changeText(screen.getByLabelText("Mensaje para JARVIS"), text);
  await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
}
describe("chat con acciones y dictado", () => {
  it("dicta, responde en voz alta y solo guarda al confirmar por voz", async () => {
    jest.mocked(recognizeSpeech).mockResolvedValueOnce("agrega un gasto de cien mil pesos hoy").mockResolvedValueOnce("confirmar");
    await render(<JarvisConversation />);
    await fireEvent.press(screen.getByRole("button", { name: "Hablar con JARVIS" }));
    await screen.findByRole("button", { name: "Confirmar cambio" });
    expect(execute).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledWith(expect.stringContaining("100.000"));
    await fireEvent.press(screen.getByRole("button", { name: "Hablar con JARVIS" }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ action: expect.objectContaining({ type: "add_transaction", transaction: expect.objectContaining({ amountMinor: 10000000n }) }) }));
    await screen.findByText(/El cambio está guardado en tu dispositivo/);
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).toBeNull();
  });
  it("cancelar una propuesta no escribe y confirmar después tampoco", async () => {
    await render(<JarvisConversation />);
    await send("agrega un gasto de 100.000 pesos hoy");
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await send("confirmar");
    expect(execute).not.toHaveBeenCalled();
    expect(screen.getByText("No hay ningún cambio pendiente de confirmar.")).toBeTruthy();
  });
  it("no sustituye silenciosamente la propuesta pendiente", async () => {
    await render(<JarvisConversation />);
    await send("agrega un gasto de 100.000 pesos hoy");
    await send("agrega un gasto de 200.000 pesos hoy");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute.mock.calls[0][0].action).toMatchObject({ transaction: { amountMinor: 10000000n } });
  });
  it("bloquea dos confirmaciones simultáneas y conserva el id si falla", async () => {
    let finish!: (value: boolean) => void;
    execute.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await render(<JarvisConversation />);
    await send("agrega un gasto de 100.000 pesos hoy");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(execute).toHaveBeenCalledTimes(1);
    await act(() => { finish(false); });
    expect(screen.queryByText(/El cambio está guardado en tu dispositivo/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute.mock.calls[0][0]).toEqual(execute.mock.calls[1][0]);
  });
  it("cancelar el micrófono o fallar el reconocimiento no ejecuta órdenes", async () => {
    jest.mocked(recognizeSpeech).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("Micrófono no disponible"));
    await render(<JarvisConversation />);
    await fireEvent.press(screen.getByRole("button", { name: "Hablar con JARVIS" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hablar con JARVIS" }));
    await screen.findByText("Micrófono no disponible");
    expect(execute).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).toBeNull();
  });
});
