/** @jest-environment node */
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it } from "@jest/globals";
import { initializeDatabase, migrationV1, readWorkspace, saveAcademicTask, startAcademicTask, deleteAcademicTask, saveHabitEntry, saveTaskProgress, type LocalDatabase } from "../src/services/storage/database";
import { createTaskDraft, parseTaskDraft } from "../src/domain/task-draft";
import { taskDeadlines } from "../src/engines/task-list";
import { buildDashboard } from "../src/engines/dashboard";

let sqlite: DatabaseSync;
let database: LocalDatabase;
let persistedPath: string | undefined;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  database = {
    async execAsync(sql) { sqlite.exec(sql); },
    async runAsync(sql, ...params) {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return sqlite.prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null; },
    async withTransactionAsync(action) {
      sqlite.exec("BEGIN");
      try { await action(); sqlite.exec("COMMIT"); }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
});
afterEach(() => {
  sqlite.close();
  if (persistedPath) {
    for (const file of [persistedPath, persistedPath + "-wal", persistedPath + "-shm"]) if (existsSync(file)) unlinkSync(file);
    persistedPath = undefined;
  }
});

describe("almacenamiento móvil con SQLite real", () => {
  it("migra una base v1 preservando tareas modificadas", async () => {
    await database.execAsync(migrationV1);
    await database.runAsync("INSERT INTO settings VALUES ('seed_version', '1')");
    const task = parseTaskDraft({ ...createTaskDraft(), title: "Trabajo previo", progress: "75" }, "previous");
    await database.runAsync("INSERT INTO subjects VALUES (?, ?)", "subject", JSON.stringify({ id: "subject", name: "Materia", professor: "Docente", credits: 3, currentGrade: 400, targetGrade: 450, progress: 20, currentTopics: [] }));
    await database.runAsync("INSERT INTO tasks VALUES (?, ?, ?)", task.id, "subject", JSON.stringify({ ...task, subjectId: "subject" }));
    await initializeDatabase(database);
    expect((await readWorkspace(database)).tasks[0].progress).toBe(75);
    expect(await database.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
    await saveAcademicTask(database, parseTaskDraft({ ...createTaskDraft(), title: "Inbox nuevo" }, "new"), "create");
    expect((await readWorkspace(database)).tasks).toHaveLength(2);
  });
  it("crea Inbox, inicia, reprograma, completa y elimina sin alterar otras tareas", async () => {
    await initializeDatabase(database);
    const task = parseTaskDraft({ ...createTaskDraft(), title: "Práctica adicional" }, "new-task");
    await saveAcademicTask(database, task, "create");
    expect((await readWorkspace(database)).tasks.find(t => t.id === task.id)?.status).toBe("INBOX");
    await startAcademicTask(database, task.id);
    expect((await readWorkspace(database)).tasks.find(t => t.id === task.id)?.status).toBe("IN_PROGRESS");
    const rescheduled = { ...task, subjectId: "demo-redes", deadline: new Date("2026-09-10T15:00:00Z"), status: "IN_PROGRESS" as const };
    await saveAcademicTask(database, rescheduled, "update");
    let current = await readWorkspace(database);
    expect(taskDeadlines(current.tasks).find(e => e.id === "deadline:new-task")?.startsAt).toEqual(rescheduled.deadline);
    await saveTaskProgress(database, task.id, 100);
    current = await readWorkspace(database);
    expect(taskDeadlines(current.tasks).some(e => e.id === "deadline:new-task")).toBe(false);
    await deleteAcademicTask(database, task.id);
    expect((await readWorkspace(database)).tasks).toHaveLength(3);
    await expect(saveAcademicTask(database, rescheduled, "update")).rejects.toThrow("ya no existe");
  });
  it("rechaza referencias inexistentes y duplicados sin sobrescribir datos", async () => {
    await initializeDatabase(database);
    const task = parseTaskDraft({ ...createTaskDraft(), title: "Nueva", subjectId: "missing" }, "invalid");
    await expect(saveAcademicTask(database, task, "create")).rejects.toThrow("materia");
    const existing = (await readWorkspace(database)).tasks[0];
    await expect(saveAcademicTask(database, { ...existing, title: "Sobrescritura" }, "create")).rejects.toThrow();
    expect((await readWorkspace(database)).tasks[0].title).toBe(existing.title);
  });
  it("conserva escrituras después de cerrar y reabrir el archivo", async () => {
    sqlite.close();
    persistedPath = join(tmpdir(), "jarvis-storage-test-" + randomUUID() + ".db");
    sqlite = new DatabaseSync(persistedPath);
    await initializeDatabase(database);
    await saveTaskProgress(database, "demo-lagrange", 80);
    await saveHabitEntry(database, "demo-german", "2026-09-08", true);
    sqlite.close();
    sqlite = new DatabaseSync(persistedPath);
    await initializeDatabase(database);
    const data = await readWorkspace(database);
    expect(data.tasks[0].progress).toBe(80);
    expect(data.habitEntries).toEqual([{ habitId: "demo-german", date: "2026-09-08" }]);
  });
  it("migra, carga relaciones y conserva dinero y fechas al hidratar", async () => {
    await initializeDatabase(database);
    const data = await readWorkspace(database);
    expect(data.subjects).toHaveLength(6);
    expect(data.tasks[0].deadline).toBeInstanceOf(Date);
    expect(data.transactions[0].amountMinor).toBe(300000000n);
    expect(buildDashboard(data).finance.balance).toBe(245000000n);
    expect(buildDashboard(data).finance.daily).toBe(6304347n);
  });
  it("reinicializar no repone el progreso ni duplica seed o hábitos", async () => {
    await initializeDatabase(database);
    await saveTaskProgress(database, "demo-lagrange", 100);
    await saveHabitEntry(database, "demo-german", "2026-09-08", true);
    await saveHabitEntry(database, "demo-german", "2026-09-08", true);
    await initializeDatabase(database);
    const data = await readWorkspace(database);
    expect(data.tasks).toHaveLength(3);
    expect(data.tasks[0].status).toBe("COMPLETED");
    expect(data.habitEntries).toHaveLength(1);
    expect(buildDashboard(data).priority?.id).not.toBe("demo-lagrange");
    expect(buildDashboard(data).briefing).toContain("2 tareas pendientes");
  });
  it("valida antes de escribir y permite revertir progreso y hábito", async () => {
    await initializeDatabase(database);
    await expect(saveTaskProgress(database, "demo-lagrange", 101)).rejects.toThrow();
    await expect(saveTaskProgress(database, "missing", 30)).rejects.toThrow();
    await expect(saveHabitEntry(database, "demo-german", "2026-02-30", true)).rejects.toThrow();
    await expect(saveHabitEntry(database, "missing", "2026-09-08", true)).rejects.toThrow();
    await saveTaskProgress(database, "demo-lagrange", 100);
    await saveTaskProgress(database, "demo-lagrange", 65);
    await saveHabitEntry(database, "demo-german", "2026-09-08", true);
    await saveHabitEntry(database, "demo-german", "2026-09-08", false);
    const data = await readWorkspace(database);
    expect(data.tasks[0].progress).toBe(65);
    expect(data.tasks[0].status).toBe("IN_PROGRESS");
    expect(data.habitEntries).toHaveLength(0);
  });
  it("conserva centavos del límite de 64 bits al cruzar SQLite", async () => {
    await initializeDatabase(database);
    const raw = { id: "huge", title: "Prueba", amountMinor: "9223372036854775807", type: "INCOME", category: "test", occurredAt: "2026-09-08T12:00:00Z" };
    await database.runAsync("INSERT INTO transactions VALUES (?, ?)", raw.id, JSON.stringify(raw));
    expect((await readWorkspace(database)).transactions.find(t => t.id === "huge")?.amountMinor).toBe(9223372036854775807n);
  });
  it("rechaza versiones futuras sin reiniciar datos", async () => {
    await initializeDatabase(database);
    await database.execAsync("PRAGMA user_version = 3");
    await expect(initializeDatabase(database)).rejects.toThrow("versión más reciente");
    expect((await readWorkspace(database)).tasks).toHaveLength(3);
  });
});
