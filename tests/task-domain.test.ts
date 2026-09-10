import { describe, expect, it } from "@jest/globals";
import { createTaskDraft, parseTaskDraft } from "../src/domain/task-draft";
import { filterTasks } from "../src/engines/task-list";
import { taskSchema } from "../src/lib/database/validation";

describe("captura de tareas y filtros", () => {
  it("captura sin fecha ni materia en Inbox y valida números vacíos", () => {
    const draft = { ...createTaskDraft(), title: "  Practicar alemán  " };
    expect(parseTaskDraft(draft, "new")).toMatchObject({ title: "Practicar alemán", status: "INBOX", deadline: null, subjectId: null });
    for (const estimatedMinutes of ["", " ", "0", "1.5", "-5", "10081"]) {
      expect(() => parseTaskDraft({ ...draft, estimatedMinutes }, "new")).toThrow();
    }
  });
  it("normaliza estados al editar y no inventa progreso al iniciar", () => {
    const draft = { ...createTaskDraft(), title: "Tarea", subjectId: "subject", deadline: new Date("2026-09-09T12:00:00Z") };
    expect(parseTaskDraft(draft, "new").status).toBe("TODO");
    expect(parseTaskDraft(draft, "new", "IN_PROGRESS")).toMatchObject({ status: "IN_PROGRESS", progress: 0 });
    expect(parseTaskDraft({ ...draft, progress: "100" }, "new").status).toBe("COMPLETED");
    expect(parseTaskDraft({ ...draft, progress: "50" }, "new", "COMPLETED").status).toBe("IN_PROGRESS");
    expect(taskSchema.safeParse({ ...parseTaskDraft(draft, "new"), status: "TODO", progress: 100 }).success).toBe(false);
  });
  it("filtra usando límites civiles de Bogotá y excluye completadas", () => {
    const create = (id: string, deadline: Date | null, progress = "0") => parseTaskDraft({ ...createTaskDraft(), title: id, subjectId: "subject", deadline, progress }, id);
    const tasks = [create("inbox", null), create("previous", new Date("2026-09-08T04:59:59Z")), create("today", new Date("2026-09-09T04:59:59Z")), create("tomorrow", new Date("2026-09-09T05:00:00Z")), create("done", new Date("2026-09-08T19:00:00Z"), "100")];
    expect(filterTasks(tasks, "today", "2026-09-08").map(t => t.id)).toEqual(["today"]);
    expect(filterTasks(tasks, "upcoming", "2026-09-08").map(t => t.id)).toEqual(["tomorrow"]);
    expect(filterTasks(tasks, "inbox", "2026-09-08").map(t => t.id)).toEqual(["inbox"]);
    expect(filterTasks(tasks, "completed", "2026-09-08").map(t => t.id)).toEqual(["done"]);
  });
});
