import { describe, expect, it } from "@jest/globals";
import { bogotaDayBounds, findFreeBlocks, monthBounds, weekStart } from "../src/lib/calendar/time";
import { calculatePriorityScore, type PriorityTask } from "../src/lib/prioritization/priority";
import { calculateRemainingBudget, calculateDailySafeSpend, calculateSavingsRate } from "../src/lib/finance/summary";
import { generateDailyBriefing } from "../src/features/dashboard/briefing";
import { resolveDashboardCommand } from "../src/features/dashboard/command";
import { taskProgressSchema } from "../src/lib/database/validation";

const now = new Date("2026-09-08T14:00:00-05:00");
const task: PriorityTask = { deadline: new Date("2026-09-09T14:00:00-05:00"), academicImpact: 30, difficulty: 4, estimatedMinutes: 90, progress: 65, status: "IN_PROGRESS" };
const at = (time: string) => new Date(`2026-09-08T${time}:00-05:00`);

describe("prioridad explicable", () => {
  it("rechaza progreso ausente, vacío o fuera de rango antes de guardar", () => {
    for (const progress of [null, undefined, "", "   ", "101", "-1", "1.5"]) {
      expect(taskProgressSchema.safeParse({ taskId: "demo-task", progress }).success).toBe(false);
    }
    expect(taskProgressSchema.parse({ taskId: "demo-task", progress: "0" }).progress).toBe(0);
  });
  it("normaliza puntuación y explica datos reales", () => {
    const result = calculatePriorityScore(task, now);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons.join(" ")).toContain("30%");
    expect(result.reasons.join(" ")).toContain("65%");
  });
  it("elimina tareas completadas aunque estén vencidas", () => {
    expect(calculatePriorityScore({ ...task, status: "COMPLETED" }, now).score).toBe(0);
    expect(calculatePriorityScore({ ...task, progress: 100 }, now).score).toBe(0);
  });
  it("acercar una fecha o aumentar impacto nunca reduce prioridad", () => {
    const far = calculatePriorityScore({ ...task, deadline: new Date(now.getTime() + 400 * 3_600_000) }, now).score;
    expect(calculatePriorityScore(task, now).score).toBeGreaterThanOrEqual(far);
    expect(calculatePriorityScore({ ...task, academicImpact: 80 }, now).score).toBeGreaterThanOrEqual(calculatePriorityScore(task, now).score);
  });
  it("aumentar progreso no aumenta la puntuación", () => {
    expect(calculatePriorityScore({ ...task, progress: 90 }, now).score).toBeLessThanOrEqual(calculatePriorityScore(task, now).score);
  });
  it("ignora examen pasado y evita NaN", () => {
    expect(calculatePriorityScore(task, now, new Date("2026-09-01")).score).toBe(calculatePriorityScore(task, now).score);
    expect(() => calculatePriorityScore({ ...task, deadline: new Date("invalid") }, now)).toThrow();
  });
  it("una tarea sin fecha no recibe urgencia de entrega", () => {
    expect(calculatePriorityScore({ ...task, deadline: null }, now).reasons).toContain("Sin fecha de entrega.");
    expect(calculatePriorityScore({ ...task, deadline: null }, now).score).toBeLessThan(calculatePriorityScore(task, now).score);
  });
});

describe("agenda local y huecos libres", () => {
  it("rechaza eventos inválidos para no inventar disponibilidad", () => {
    expect(() => findFreeBlocks([{ startsAt: at("14:00"), endsAt: at("13:00") }], at("09:00"), at("20:00"))).toThrow();
    expect(() => findFreeBlocks([{ startsAt: new Date("invalid"), endsAt: at("13:00") }], at("09:00"), at("20:00"))).toThrow();
    expect(() => findFreeBlocks([], at("20:00"), at("09:00"))).toThrow();
    expect(() => findFreeBlocks([], at("09:00"), at("20:00"), 0)).toThrow();
  });
  it("respeta días Bogotá, semanas y año bisiesto", () => {
    expect(bogotaDayBounds("2026-09-08").start.toISOString()).toBe("2026-09-08T05:00:00.000Z");
    expect(weekStart("2026-09-13")).toBe("2026-09-07");
    expect(monthBounds("2028-02-28").daysRemaining).toBe(2);
    expect(monthBounds("2026-09-30").daysRemaining).toBe(1);
    expect(() => bogotaDayBounds("2026-02-30")).toThrow();
  });
  it("fusiona eventos solapados, anidados y adyacentes", () => {
    const events = [
      { startsAt: at("11:00"), endsAt: at("13:00") },
      { startsAt: at("10:00"), endsAt: at("12:00") },
      { startsAt: at("13:00"), endsAt: at("14:00") },
      { startsAt: at("18:00"), endsAt: at("21:00") },
    ];
    expect(findFreeBlocks(events, at("09:00"), at("20:00"))).toEqual([
      { startsAt: at("09:00"), endsAt: at("10:00") },
      { startsAt: at("14:00"), endsAt: at("18:00") },
    ]);
  });
  it("no propone horas anteriores a la ventana ni huecos menores al mínimo", () => {
    expect(findFreeBlocks([{ startsAt: at("14:00"), endsAt: at("15:00") }], at("14:30"), at("15:29"))).toEqual([]);
    expect(findFreeBlocks([], at("14:00"), at("14:30"))).toHaveLength(1);
    expect(findFreeBlocks([], at("20:00"), at("20:00"))).toEqual([]);
  });
});

describe("finanzas del resumen", () => {
  it("divide saldo entre todos los días restantes, incluido hoy", () => {
    expect(calculateRemainingBudget(200000000n, 55000000n)).toBe(145000000n);
    expect(calculateDailySafeSpend(145000000n, 23)).toBe(6304347n);
  });
  it("maneja falta de presupuesto, gastos excedidos e ingresos cero", () => {
    expect(calculateRemainingBudget(null, 100n)).toBeNull();
    expect(calculateDailySafeSpend(null, 23)).toBeNull();
    expect(calculateDailySafeSpend(-100n, 23)).toBe(0n);
    expect(calculateSavingsRate(0n, 100n)).toBeNull();
    expect(() => calculateDailySafeSpend(100n, 0)).toThrow();
  });
});

describe("briefing y consultas", () => {
  it("el briefing cambia al cambiar datos", () => {
    expect(generateDailyBriefing({ classes: 2, pendingTasks: 3, freeMinutes: 90, priorityTitle: "SQL" })).toContain("2 clases y 3 tareas");
    expect(generateDailyBriefing({ classes: 0, pendingTasks: 0, freeMinutes: 0, priorityTitle: null })).toContain("No hay tareas pendientes");
    expect(generateDailyBriefing({ classes: 0, pendingTasks: 0, freeMinutes: 438.7568, priorityTitle: null })).toContain("439 minutos");
  });
  it("resuelve preguntas sin afirmar que haya modificado la agenda", () => {
    const context = { briefing: "Tienes 2 clases.", priority: "Estudia Redes.", finances: "Saldo 100 COP.", academic: "Promedio 4,20.", tasks: ["SQL"] };
    expect(resolveDashboardCommand("¿Cuánto puedo gastar?", context)).toBe(context.finances);
    expect(resolveDashboardCommand("¿Qué debería estudiar hoy?", context)).toBe(context.priority);
    expect(resolveDashboardCommand("Organiza mi día", context)).toContain("no se ha modificado");
    expect(resolveDashboardCommand("envía un correo", context)).toContain("Puedo resumir");
  });
});
