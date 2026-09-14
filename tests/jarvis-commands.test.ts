import { describe, expect, it } from "@jest/globals";
import { interpretCommand } from "../src/features/jarvis/commands";
import { parsePesoAmount } from "../src/features/jarvis/money";
import type { Workspace } from "../src/domain/models";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";
import { localDateKey } from "../src/lib/utils/format";

const now = new Date("2026-09-11T02:30:00Z"); // Still September 10 in Bogotá.
const data: Workspace = {
  user: { id: "juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
  subjects: demoSubjects, tasks: demoTasks, events: demoEvents, transactions: demoTransactions,
  habits: demoHabits, habitEntries: [], exams: [], budget: { id: "budget", month: "2026-09", amountMinor: 200000000n },
};
const interpret = (text: string, workspace = data) => interpretCommand(text, workspace, now, "proposed-action");

describe("importes dictados sin pérdida de precisión", () => {
  it.each([
    ["100.000", 10000000n], ["100000", 10000000n], ["cien mil", 10000000n],
    ["treinta y dos mil quinientos", 3250000n], ["un millón doscientos mil", 120000000n],
    ["dos millones cincuenta mil", 205000000n], ["100 mil", 10000000n],
    ["100.000,50", 10000050n], ["0,01", 1n], ["0.50", 50n],
    ["cien mil con cincuenta centavos", 10000050n], ["92.233.720.368.547.758,07", 9223372036854775807n],
  ])("interpreta %s pesos", (text, amount) => expect(parsePesoAmount(text)).toBe(amount));
  it.each(["", "cero", "-100000", "menos cien mil", "100,000", "1.00.000", "100.000,001", "dos tres", "un millon un millon", "100 y 200", "92.233.720.368.547.758,08", "NaN", "Infinity", "constructor", "__proto__", "dos millone"])("rechaza %s", text => expect(parsePesoAmount(text)).toBeNull());
});

describe("órdenes locales propuestas", () => {
  it.each(["agrega un gasto de 100.000 persos al dia de hoy", "Jarvis, agrega un gasto de cien mil pesos hoy", "gasté 100.000 pesos hoy"])("prepara la orden solicitada: %s", text => {
    const result = interpret(text);
    expect(result.kind).toBe("proposal");
    if (result.kind !== "proposal" || result.proposal.action.type !== "add_transaction") throw new Error("Expected expense");
    const transaction = result.proposal.action.transaction;
    expect(transaction.amountMinor).toBe(10000000n);
    expect(transaction.type).toBe("EXPENSE");
    expect(localDateKey(transaction.occurredAt)).toBe("2026-09-10");
    expect(result.proposal.detail).toContain("2026-09-10");
    expect(data.transactions).toHaveLength(5); // Parsing has no writes.
  });
  it("admite concepto, ingreso y ayer sin confundir sus importes", () => {
    const expense = interpret("registra un gasto de treinta y dos mil pesos ayer en almuerzo");
    expect(expense).toMatchObject({ kind: "proposal", proposal: { action: { transaction: { type: "EXPENSE", amountMinor: 3200000n, category: "food", title: "almuerzo" } } } });
    if (expense.kind === "proposal" && expense.proposal.action.type === "add_transaction") expect(localDateKey(expense.proposal.action.transaction.occurredAt)).toBe("2026-09-09");
    expect(interpret("recibí dos millones de salario hoy")).toMatchObject({ kind: "proposal", proposal: { action: { transaction: { type: "INCOME", amountMinor: 200000000n, title: "salario" } } } });
  });
  it.each(["agrega un gasto hoy", "agrega un gasto de -100 pesos hoy", "agrega un gasto de 100 pesos hoy y ayer", "agrega un gasto de 100 pesos mañana", "agrega un gasto de 100 pesos el 2026-02-30", "agrega un gasto de 100 pesos el lunes", "agrega un gasto de 100 pesos hoy y otro de 200 pesos", "no agregues un gasto de 100 pesos"])("no propone cambios ambiguos o negados: %s", text => expect(interpret(text).kind).toBe("reply"));
  it("las consultas sobre gastos no crean movimientos", () => {
    expect(interpret("¿Cuánto puedo gastar hoy?")).toMatchObject({ kind: "reply", message: expect.stringContaining("Saldo:") });
  });
  it("confirma y cancela solo con expresiones explícitas", () => {
    expect(interpret("Sí, confirmar")).toEqual({ kind: "confirm" });
    expect(interpret("cancela")).toEqual({ kind: "cancel" });
    expect(interpret("confirmar un gasto de cien pesos").kind).toBe("reply");
  });
  it("crea Inbox y busca una tarea concreta para iniciar o completar", () => {
    expect(interpret("crea una tarea llamada repasar integrales")).toMatchObject({ kind: "proposal", proposal: { action: { type: "create_task", task: { title: "repasar integrales", status: "INBOX", deadline: null } } } });
    expect(interpret("completa la tarea taller de Lagrange")).toMatchObject({ kind: "proposal", proposal: { action: { type: "complete_task", taskId: "demo-lagrange" } } });
    expect(interpret("inicia la tarea entregar consultas SQL")).toMatchObject({ kind: "proposal", proposal: { action: { type: "start_task", taskId: "demo-sql" } } });
    expect(interpret("crea una tarea estudiar mañana").kind).toBe("reply");
  });
  it("pide precisión si varias tareas coinciden", () => {
    expect(interpret("completa la tarea Lagrange", { ...data, tasks: [...data.tasks, { ...data.tasks[0], id: "other", title: "Repasar Lagrange" }] })).toMatchObject({ kind: "reply", message: expect.stringContaining("varias tareas") });
  });
  it("el título exacto permite resolver una coincidencia parcial ambigua", () => {
    expect(interpret("completa la tarea terminar taller de lagrange", { ...data, tasks: [...data.tasks, { ...data.tasks[0], id: "other", title: "Terminar taller de Lagrange adicional" }] })).toMatchObject({ kind: "proposal", proposal: { action: { taskId: "demo-lagrange" } } });
  });
  it("marca el hábito hoy sin alternarlo al repetir", () => {
    expect(interpret("marca el hábito alemán como completado hoy")).toMatchObject({ kind: "proposal", proposal: { action: { type: "complete_habit", habitId: "demo-german", date: "2026-09-10" } } });
    expect(interpret("completa el hábito alemán hoy", { ...data, habitEntries: [{ habitId: "demo-german", date: "2026-09-10" }] })).toMatchObject({ kind: "reply", message: expect.stringContaining("ya está marcado") });
  });
});
