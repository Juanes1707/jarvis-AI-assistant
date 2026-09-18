import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import IdentityScreen from "../src/app/identity";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { getJarvisProfile, updateJarvisProfile } from "../src/services/backend/client";
import type { BackendUserProfile } from "../src/services/backend/client";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("../src/services/backend/client", () => ({ getJarvisProfile: jest.fn(), updateJarvisProfile: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const TOKEN = "un-token-de-servidor-con-mas-de-24";
const EMPTY: BackendUserProfile = { user_id: "owner", onboarding_completed: false };

function mockWorkspace(backendEnabled = true) {
  jest.mocked(useWorkspace).mockReturnValue({
    preferences: {
      showSuggestions: true, voiceEnabled: false, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled, backendUrl: "https://equipo.tailnet.ts.net", backendToken: TOKEN,
    },
  } as unknown as ReturnType<typeof useWorkspace>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkspace();
  jest.mocked(getJarvisProfile).mockResolvedValue(EMPTY);
});

describe("perfil real en modo servidor", () => {
  it("un perfil vacío se presenta vacío, sin datos de demostración", async () => {
    await render(<IdentityScreen />);
    await screen.findByText("JARVIS todavía no sabe nada de ti.");
    expect(screen.getByLabelText("NOMBRE COMPLETO").props.value).toBe("");
    expect(screen.getByLabelText("CIUDAD").props.value).toBe("");
    expect(screen.getByText("No hay cambios sin guardar.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar perfil" }).props.accessibilityState.disabled).toBe(true);
  });

  it("guarda solo los campos editados y luego refleja la respuesta del servidor", async () => {
    jest.mocked(updateJarvisProfile).mockResolvedValue({
      ...EMPTY, display_name: "Juan Esteban Rubio", onboarding_completed: true,
    });
    await render(<IdentityScreen />);
    await screen.findByLabelText("NOMBRE COMPLETO");
    await fireEvent.changeText(screen.getByLabelText("NOMBRE COMPLETO"), "Juan Esteban Rubio");
    expect(screen.getByText("1 campo sin guardar.")).toBeTruthy();

    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Guardar perfil" })); });

    expect(updateJarvisProfile).toHaveBeenCalledWith(
      { url: "https://equipo.tailnet.ts.net", token: TOKEN },
      { display_name: "Juan Esteban Rubio", onboarding_completed: true },
    );
    await screen.findByText("Perfil guardado en tu servidor.");
    expect(screen.getByLabelText("NOMBRE COMPLETO").props.value).toBe("Juan Esteban Rubio");
    expect(screen.getByText("No hay cambios sin guardar.")).toBeTruthy();
  });

  it("si el servidor falla conserva lo escrito y no afirma que guardó", async () => {
    jest.mocked(updateJarvisProfile).mockRejectedValue(new Error("El servidor JARVIS respondió con un error (503)."));
    await render(<IdentityScreen />);
    await screen.findByLabelText("CIUDAD");
    await fireEvent.changeText(screen.getByLabelText("CIUDAD"), "Bogotá");

    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Guardar perfil" })); });

    await screen.findByText(/El servidor JARVIS respondió con un error \(503\)\./);
    expect(screen.getByLabelText("CIUDAD").props.value).toBe("Bogotá");
    expect(screen.getByText("1 campo sin guardar.")).toBeTruthy();
    expect(screen.queryByText("Perfil guardado en tu servidor.")).toBeNull();
  });

  it("explica que el perfil vive en el servidor cuando el modo está apagado", async () => {
    mockWorkspace(false);
    await render(<IdentityScreen />);
    expect(screen.getByText("Esto vive en tu servidor.")).toBeTruthy();
    expect(getJarvisProfile).not.toHaveBeenCalled();
  });

  it("muestra el error real del servidor y permite reintentar la lectura", async () => {
    jest.mocked(getJarvisProfile).mockRejectedValueOnce(new Error("No pude conectar con el servidor JARVIS."));
    await render(<IdentityScreen />);
    await screen.findByText("No pude conectar con el servidor JARVIS.");
    jest.mocked(getJarvisProfile).mockResolvedValueOnce(EMPTY);
    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Reintentar" })); });
    await waitFor(() => expect(screen.getByLabelText("NOMBRE COMPLETO")).toBeTruthy());
  });
});
