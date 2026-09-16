import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import ProfileScreen from "../src/app/(tabs)/profile";
import { useWorkspace } from "../src/services/storage/workspace-provider";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

describe("perfil real del servidor", () => {
  it("muestra la identidad persistida y no la descripción demo", async () => {
    jest.mocked(useWorkspace).mockReturnValue({
      data: {
        user: { id: "owner", name: "Juanes", semester: 0, timezone: "America/Bogota" },
        subjects: [], tasks: [], events: [], transactions: [], habits: [], habitEntries: [], exams: [], budget: null,
      },
      dashboard: {},
      preferences: {
        showSuggestions: true, voiceEnabled: true, voiceId: null,
        aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
        backendEnabled: true, backendUrl: "https://equipo.tailnet.ts.net", backendToken: "token-seguro-con-mas-de-24-caracteres",
      },
      backendProfile: {
        user_id: "owner",
        display_name: "Juan Esteban Rubio Castaño",
        preferred_name: "Juanes",
        country: "Colombia",
        city: "Chía",
        occupation: "Estudiante",
        study_program: "Ingeniería Informática en la Universidad de La Sabana",
        timezone: "America/Bogota",
        onboarding_completed: true,
      },
      busy: false,
      toggleSuggestions: jest.fn(),
    } as unknown as ReturnType<typeof useWorkspace>);

    await render(<ProfileScreen />);

    expect(screen.getByRole("header", { name: "Juan Esteban Rubio Castaño" })).toBeTruthy();
    expect(screen.getByText("Chía, Colombia")).toBeTruthy();
    expect(screen.getByText("Ingeniería Informática en la Universidad de La Sabana")).toBeTruthy();
    expect(screen.queryByText(/registros de ejemplo/i)).toBeNull();
    expect(screen.queryByText(/Semestre 0/)).toBeNull();
  });
});
