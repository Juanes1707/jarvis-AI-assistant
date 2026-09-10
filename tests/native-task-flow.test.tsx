import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router } from "expo-router";
import { TaskEditor } from "../src/features/tasks/task-editor";
import TaskDetailScreen from "../src/app/tasks/[id]";
import { useWorkspace } from "../src/services/storage/workspace-provider";
import { createTaskDraft, parseTaskDraft } from "../src/domain/task-draft";

jest.mock("../src/services/storage/workspace-provider", () => ({ useWorkspace: jest.fn() }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({ id: "task" }) }));
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("expo-crypto", () => ({ randomUUID: () => "generated-test-task" }));
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { SafeAreaView: View };
});

const task = parseTaskDraft({ ...createTaskDraft(), title: "Tarea de prueba" }, "task");
const saveTask = jest.fn<ReturnType<typeof useWorkspace>["saveTask"]>();
const deleteTask = jest.fn<ReturnType<typeof useWorkspace>["deleteTask"]>();
beforeEach(() => {
  jest.clearAllMocks();
  saveTask.mockResolvedValue(true); deleteTask.mockResolvedValue(true);
  jest.mocked(useWorkspace).mockReturnValue({
    data: { subjects: [], tasks: [task] }, dashboard: { tasks: [] }, busy: false, saveTask, deleteTask,
    updateProgress: jest.fn(), startTask: jest.fn(),
  } as unknown as ReturnType<typeof useWorkspace>);
});
describe("flujos táctiles de tareas", () => {
  it("rechaza título vacío y crea una captura Inbox al guardar", async () => {
    await render(<TaskEditor />);
    await fireEvent.press(screen.getByRole("button", { name: "Crear tarea" }));
    expect(saveTask).not.toHaveBeenCalled();
    expect(screen.getByText("Escribe un título.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Título de la tarea"), "Practicar subnetting");
    await fireEvent.press(screen.getByRole("button", { name: "Crear tarea" }));
    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Practicar subnetting", deadline: null, status: "INBOX" }), "create");
    expect(router.replace).toHaveBeenCalledWith("/tasks");
  });
  it("eliminar requiere elegir la acción destructiva de la confirmación", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<TaskDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Eliminar tarea" }));
    expect(deleteTask).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2];
    expect(buttons?.some(button => button.style === "cancel")).toBe(true);
    buttons?.find(button => button.style === "destructive")?.onPress?.();
    expect(deleteTask).toHaveBeenCalledWith("task");
    alert.mockRestore();
  });
});
