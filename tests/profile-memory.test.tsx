import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import MemoryScreen from "../src/app/memory";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { createJarvisMemory, forgetJarvisMemory, listJarvisMemories } from "../src/services/backend/client";
import type { BackendMemory } from "../src/services/backend/client";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/backend/client", () => ({
  listJarvisMemories: jest.fn(), createJarvisMemory: jest.fn(), forgetJarvisMemory: jest.fn(),
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const TOKEN = "un-token-de-servidor-con-mas-de-24";
const SETTINGS = { url: "https://equipo.tailnet.ts.net", token: TOKEN };

function memory(overrides: Partial<BackendMemory> & Pick<BackendMemory, "id" | "kind" | "content">): BackendMemory {
  return { status: "active", ...overrides };
}

function mockWorkspace(backendEnabled = true) {
  jest.mocked(useWorkspace).mockReturnValue({
    preferences: {
      showSuggestions: true, voiceEnabled: false, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled, backendUrl: SETTINGS.url, backendToken: TOKEN,
    },
  } as unknown as ReturnType<typeof useWorkspace>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkspace();
  jest.mocked(listJarvisMemories).mockResolvedValue({ memories: [] });
});

describe("memoria de JARVIS", () => {
  it("invita a enseñarle algo cuando no recuerda nada", async () => {
    await render(<MemoryScreen />);
    await screen.findByText("Todavía no recuerda nada sobre ti.");
    expect(screen.getByRole("button", { name: "Enseñarle algo" })).toBeTruthy();
  });

  it("separa hechos, preferencias, metas y límites", async () => {
    jest.mocked(listJarvisMemories).mockResolvedValue({
      memories: [
        memory({ id: "1", kind: "fact", content: "Estudio Ingeniería de Sistemas" }),
        memory({ id: "2", kind: "preference", content: "Prefiero estudiar en la mañana" }),
        memory({ id: "3", kind: "goal", content: "Subir el promedio a 4,2" }),
        memory({ id: "4", kind: "constraint", content: "No gastar más de 800.000 al mes" }),
      ],
    });
    await render(<MemoryScreen />);
    await screen.findByText("HECHOS");
    expect(screen.getByText("PREFERENCIAS")).toBeTruthy();
    expect(screen.getByText("METAS")).toBeTruthy();
    expect(screen.getByText("LÍMITES")).toBeTruthy();
    expect(screen.getByText("Estudio Ingeniería de Sistemas")).toBeTruthy();
  });

  it("guarda un recuerdo nuevo con el tipo elegido y vuelve a leer la lista", async () => {
    jest.mocked(createJarvisMemory).mockResolvedValue(memory({ id: "9", kind: "constraint", content: "Los martes tengo laboratorio" }));
    await render(<MemoryScreen />);
    await screen.findByRole("button", { name: "Enseñarle algo" });
    await fireEvent.press(screen.getByRole("button", { name: "Enseñarle algo" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Un límite" }));
    await fireEvent.changeText(screen.getByLabelText("QUÉ DEBE RECORDAR"), "Los martes tengo laboratorio");

    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Guardar en su memoria" })); });

    expect(createJarvisMemory).toHaveBeenCalledWith(SETTINGS, { kind: "constraint", content: "Los martes tengo laboratorio" });
    expect(listJarvisMemories).toHaveBeenCalledTimes(2);
    await screen.findByText("Guardado: Los martes tengo laboratorio");
  });

  it("olvidar exige confirmar la acción destructiva", async () => {
    jest.mocked(listJarvisMemories).mockResolvedValue({
      memories: [memory({ id: "7", kind: "fact", content: "Vivo en Bogotá" })],
    });
    jest.mocked(forgetJarvisMemory).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<MemoryScreen />);
    await screen.findByText("Vivo en Bogotá");

    await fireEvent.press(screen.getByRole("button", { name: "Olvidar: Vivo en Bogotá" }));
    expect(forgetJarvisMemory).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2];
    expect(buttons?.some(button => button.style === "cancel")).toBe(true);
    await act(async () => { buttons?.find(button => button.style === "destructive")?.onPress?.(); });

    expect(forgetJarvisMemory).toHaveBeenCalledWith(SETTINGS, "7");
    alert.mockRestore();
  });

  it("muestra el fallo del servidor al olvidar sin borrar la fila de la vista", async () => {
    jest.mocked(listJarvisMemories).mockResolvedValue({
      memories: [memory({ id: "7", kind: "fact", content: "Vivo en Bogotá" })],
    });
    jest.mocked(forgetJarvisMemory).mockRejectedValue(new Error("El servidor JARVIS respondió con un error (500)."));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<MemoryScreen />);
    await screen.findByText("Vivo en Bogotá");
    await fireEvent.press(screen.getByRole("button", { name: "Olvidar: Vivo en Bogotá" }));
    await act(async () => { alert.mock.calls[0][2]?.find(button => button.style === "destructive")?.onPress?.(); });

    await waitFor(() => expect(screen.getByText("El servidor JARVIS respondió con un error (500).")).toBeTruthy());
    expect(screen.getByText("Vivo en Bogotá")).toBeTruthy();
    alert.mockRestore();
  });
});
