import { z } from "zod";
import type { AcademicTask, Habit, HabitEntry, Workspace } from "../../domain/models";
import { eventSchema, subjectSchema, taskSchema, transactionSchema } from "../../lib/database/validation";
import { bogotaDayBounds } from "../../lib/calendar/time";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "./demo-data";
import { resolveTaskStatus } from "../../domain/task-draft";

type Parameter = string | number | null;
export interface LocalDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: Parameter[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, ...params: Parameter[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: Parameter[]): Promise<T | null>;
  withTransactionAsync(action: () => Promise<void>): Promise<void>;
}
const habitSchema = z.object({ id: z.string().min(1), name: z.string().min(1), weeklyGoal: z.number().int().min(1).max(7) });
type PayloadRow = { payload: string };
const serialize = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);

export const migrationV1 = `
  CREATE TABLE subjects (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
  CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, subject_id TEXT NOT NULL REFERENCES subjects(id), payload TEXT NOT NULL CHECK(json_valid(payload)));
  CREATE TABLE events (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
  CREATE TABLE transactions (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
  CREATE TABLE habits (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));
  CREATE TABLE habit_entries (habitId TEXT NOT NULL REFERENCES habits(id), date TEXT NOT NULL, PRIMARY KEY (habitId, date));
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  PRAGMA user_version = 1;
`;
export const migrationV2 = `
  CREATE TABLE tasks_v2 (id TEXT PRIMARY KEY NOT NULL, subject_id TEXT REFERENCES subjects(id), payload TEXT NOT NULL CHECK(json_valid(payload)));
  INSERT INTO tasks_v2 SELECT id, subject_id, payload FROM tasks;
  DROP TABLE tasks;
  ALTER TABLE tasks_v2 RENAME TO tasks;
  PRAGMA user_version = 2;
`;

export async function initializeDatabase(db: LocalDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if ((version?.user_version ?? 0) > 2) throw new Error("Esta base requiere una versión más reciente de JARVIS.");
  await db.withTransactionAsync(async () => {
    if (!version?.user_version) await db.execAsync(migrationV1);
    if ((version?.user_version ?? 0) < 2) await db.execAsync(migrationV2);
    const seeded = await db.getFirstAsync("SELECT value FROM settings WHERE key = 'seed_version'");
    if (seeded) return;
    for (const row of demoSubjects) await db.runAsync("INSERT INTO subjects VALUES (?, ?)", row.id, serialize(row));
    for (const row of demoTasks) await db.runAsync("INSERT INTO tasks VALUES (?, ?, ?)", row.id, row.subjectId, serialize(row));
    for (const row of demoEvents) await db.runAsync("INSERT INTO events VALUES (?, ?)", row.id, serialize(row));
    for (const row of demoTransactions) await db.runAsync("INSERT INTO transactions VALUES (?, ?)", row.id, serialize(row));
    for (const row of demoHabits) await db.runAsync("INSERT INTO habits VALUES (?, ?)", row.id, serialize(row));
    await db.runAsync("INSERT INTO settings VALUES ('budget', ?)", "200000000");
    await db.runAsync("INSERT INTO settings VALUES ('seed_version', '1')");
  });
}

function decodeTask(payload: string): AcademicTask {
  const raw = JSON.parse(payload);
  return taskSchema.parse({ ...raw, deadline: raw.deadline === null ? null : new Date(raw.deadline) });
}
export async function readWorkspace(db: LocalDatabase): Promise<Workspace> {
  const subjects = (await db.getAllAsync<PayloadRow>("SELECT payload FROM subjects ORDER BY rowid")).map(row => subjectSchema.parse(JSON.parse(row.payload)));
  const tasks = (await db.getAllAsync<PayloadRow>("SELECT payload FROM tasks ORDER BY rowid")).map(row => decodeTask(row.payload));
  const events = (await db.getAllAsync<PayloadRow>("SELECT payload FROM events ORDER BY rowid")).map(row => {
    const raw = JSON.parse(row.payload);
    return eventSchema.parse({ ...raw, startsAt: new Date(raw.startsAt), endsAt: new Date(raw.endsAt) });
  });
  const transactions = (await db.getAllAsync<PayloadRow>("SELECT payload FROM transactions ORDER BY rowid")).map(row => {
    const raw = JSON.parse(row.payload);
    return transactionSchema.parse({ ...raw, amountMinor: BigInt(raw.amountMinor), occurredAt: new Date(raw.occurredAt) });
  });
  const habits: Habit[] = (await db.getAllAsync<PayloadRow>("SELECT payload FROM habits ORDER BY rowid")).map(row => habitSchema.parse(JSON.parse(row.payload)));
  const habitEntries = await db.getAllAsync<HabitEntry>("SELECT habitId, date FROM habit_entries ORDER BY date");
  const budget = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'budget'");
  return {
    user: { id: "demo-juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
    subjects, tasks, events, transactions, habits, habitEntries,
    budget: budget ? { id: "demo-budget", month: "2026-09", amountMinor: BigInt(budget.value) } : null,
    exams: [{ id: "demo-exam-redes", subjectId: "demo-redes", title: "Parcial de Redes", startsAt: new Date("2026-09-12T14:00:00Z"), weight: 30 }],
  };
}

export async function saveTaskProgress(db: LocalDatabase, id: string, progress: number) {
  z.number().int().min(0).max(100).parse(progress);
  const row = await db.getFirstAsync<PayloadRow>("SELECT payload FROM tasks WHERE id = ?", id);
  if (!row) throw new Error("La tarea ya no existe.");
  const current = decodeTask(row.payload);
  const updated = taskSchema.parse({ ...current, progress, status: resolveTaskStatus({ ...current, progress }, current.status) });
  await db.runAsync("UPDATE tasks SET payload = ? WHERE id = ?", serialize(updated), id);
}
export async function saveHabitEntry(db: LocalDatabase, id: string, date: string, completed: boolean) {
  bogotaDayBounds(date);
  const exists = await db.getFirstAsync("SELECT id FROM habits WHERE id = ?", id);
  if (!exists) throw new Error("El hábito ya no existe.");
  if (completed) await db.runAsync("INSERT OR IGNORE INTO habit_entries (habitId, date) VALUES (?, ?)", id, date);
  else await db.runAsync("DELETE FROM habit_entries WHERE habitId = ? AND date = ?", id, date);
}

export async function saveAcademicTask(db: LocalDatabase, input: AcademicTask, mode: "create" | "update") {
  const task = taskSchema.parse(input);
  if (task.subjectId && !await db.getFirstAsync("SELECT id FROM subjects WHERE id = ?", task.subjectId)) throw new Error("La materia no existe.");
  if (mode === "create") {
    await db.runAsync("INSERT INTO tasks (id, subject_id, payload) VALUES (?, ?, ?)", task.id, task.subjectId, serialize(task));
  } else {
    const result = await db.runAsync("UPDATE tasks SET subject_id = ?, payload = ? WHERE id = ?", task.subjectId, serialize(task), task.id);
    if (!result.changes) throw new Error("La tarea ya no existe.");
  }
}
export async function startAcademicTask(db: LocalDatabase, id: string) {
  const row = await db.getFirstAsync<PayloadRow>("SELECT payload FROM tasks WHERE id = ?", id);
  if (!row) throw new Error("La tarea ya no existe.");
  const task = decodeTask(row.payload);
  if (task.status === "COMPLETED") throw new Error("La tarea ya está completada.");
  await saveAcademicTask(db, { ...task, status: "IN_PROGRESS" }, "update");
}
export async function deleteAcademicTask(db: LocalDatabase, id: string) {
  const result = await db.runAsync("DELETE FROM tasks WHERE id = ?", id);
  if (!result.changes) throw new Error("La tarea ya no existe.");
}
