import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { WorkspaceProvider, useWorkspace } from "../src/services/storage/workspace-provider";
import { getJarvisProfile, getJarvisWorkspace } from "../src/services/backend/client";
import { readPreferences } from "../src/services/storage/preferences";
import { initializeDatabase, readWorkspace } from "../src/services/storage/database";
import { demoEvents, demoHabits, demoSubjects, demoTasks, demoTransactions } from "../src/services/storage/demo-data";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn(async () => ({})) }));
jest.mock("../src/services/storage/database", () => ({
  initializeDatabase: jest.fn(),
  readWorkspace: jest.fn(),
  saveHabitEntry: jest.fn(),
  saveTaskProgress: jest.fn(),
  saveAcademicTask: jest.fn(),
  startAcademicTask: jest.fn(),
  deleteAcademicTask: jest.fn(),
  executeJarvisAction: jest.fn(),
}));
jest.mock("../src/services/storage/preferences", () => ({
  defaultPreferences: {
    showSuggestions: true, voiceEnabled: true, voiceId: null,
    aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
    backendEnabled: false, backendUrl: "", backendToken: "",
  },
  readPreferences: jest.fn(),
  savePreferences: jest.fn(),
}));
jest.mock("../src/services/backend/client", () => ({ getJarvisProfile: jest.fn(), getJarvisWorkspace: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));

function Probe() {
  const { data } = useWorkspace();
  return <Text>{`${data.user.name}|${data.tasks.length}|${data.tasks[0]?.id ?? "empty"}`}</Text>;
}

describe("workspace en modo servidor", () => {
  it("conserva el nombre confirmado cuando la red privada no responde al reiniciar", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify({
      userId: "owner", name: "Juanes", timezone: "America/Bogota", url: "https://equipo.tailnet.ts.net",
    }));
    jest.mocked(initializeDatabase).mockResolvedValue();
    jest.mocked(readWorkspace).mockResolvedValue({
      user: { id: "demo-juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
      subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions,
      habits: demoHabits, habitEntries: [], exams: [], budget: null,
    });
    jest.mocked(readPreferences).mockResolvedValue({
      showSuggestions: true, voiceEnabled: true, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled: true,
      backendUrl: "https://equipo.tailnet.ts.net",
      backendToken: "un-token-de-servidor-con-mas-de-24",
    });
    jest.mocked(getJarvisProfile).mockRejectedValue(new Error("No pude conectar con el servidor JARVIS."));
    jest.mocked(getJarvisWorkspace).mockRejectedValue(new Error("No pude conectar con el servidor JARVIS."));

    await render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText("Juanes|0|empty")).toBeTruthy();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("jarvis:backend-identity-cache:v1");
  });

  it("usa el perfil PostgreSQL y no presenta filas demo como datos reales", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(initializeDatabase).mockResolvedValue();
    jest.mocked(readWorkspace).mockResolvedValue({
      user: { id: "demo-juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
      subjects: demoSubjects,
      tasks: demoTasks,
      events: demoEvents,
      transactions: demoTransactions,
      habits: demoHabits,
      habitEntries: [],
      exams: [{ id: "demo-exam", subjectId: "demo-redes", title: "Parcial", startsAt: new Date(), weight: 30 }],
      budget: { id: "demo-budget", month: "2026-09", amountMinor: 200000000n },
    });
    jest.mocked(readPreferences).mockResolvedValue({
      showSuggestions: true, voiceEnabled: true, voiceId: null,
      aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b",
      backendEnabled: true,
      backendUrl: "https://equipo.tailnet.ts.net",
      backendToken: "un-token-de-servidor-con-mas-de-24",
    });
    jest.mocked(getJarvisProfile).mockResolvedValue({
      user_id: "owner",
      display_name: "Juan Esteban Rubio Castaño",
      preferred_name: "Juanes",
      country: "Colombia",
      city: "Chía",
      timezone: "America/Bogota",
      onboarding_completed: true,
    });
    jest.mocked(getJarvisWorkspace).mockResolvedValue({
      subjects: [{
        id: "subject-real", name: "Bases de Datos", professor: "Ana", credits: 3, active: true,
        created_at: "2026-09-16T12:00:00Z", updated_at: "2026-09-16T12:00:00Z",
      }],
      tasks: [{
        id: "task-real", title: "Modelo relacional", status: "PENDING", priority: "HIGH",
        due_at: null, subject_id: "subject-real", subject_name: "Bases de Datos",
      }],
      events: [], transactions: [], budget: null,
    });

    await render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText("Juanes|1|task-real")).toBeTruthy();
    expect(getJarvisProfile).toHaveBeenCalledWith({
      url: "https://equipo.tailnet.ts.net",
      token: "un-token-de-servidor-con-mas-de-24",
    });
    expect(getJarvisWorkspace).toHaveBeenCalledWith({
      url: "https://equipo.tailnet.ts.net",
      token: "un-token-de-servidor-con-mas-de-24",
    }, expect.stringMatching(/^\d{4}-\d{2}$/));
  });
});
