import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { WorkspaceProvider, useWorkspace } from "../src/services/storage/workspace-provider";
import { getJarvisProfile } from "../src/services/backend/client";
import { readPreferences } from "../src/services/storage/preferences";
import { initializeDatabase, readWorkspace } from "../src/services/storage/database";
import { demoEvents, demoHabits, demoSubjects, demoTasks, demoTransactions } from "../src/services/storage/demo-data";

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
jest.mock("../src/services/backend/client", () => ({ getJarvisProfile: jest.fn() }));

function Probe() {
  const { data } = useWorkspace();
  return <Text>{`${data.user.name}|${data.tasks.length}|${data.tasks[0]?.id ?? "empty"}`}</Text>;
}

describe("workspace en modo servidor", () => {
  it("usa el perfil PostgreSQL y no presenta filas demo como datos reales", async () => {
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

    await render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText("Juanes|0|empty")).toBeTruthy();
    expect(getJarvisProfile).toHaveBeenCalledWith({
      url: "https://equipo.tailnet.ts.net",
      token: "un-token-de-servidor-con-mas-de-24",
    });
  });
});
