import { describe, expect, it } from "@jest/globals";
import { formatMoney, localDateKey, formatTime, formatGrade } from "../src/lib/utils/format";
import { summarizeAcademics } from "../src/features/dashboard/summary";
import { subjectSchema, taskSchema, eventSchema, transactionSchema } from "../src/lib/database/validation";
import { demoSubjects, demoTasks, demoEvents, demoTransactions } from "../src/services/storage/demo-data";

describe("dinero y presentación", () => {
  it("presenta COP sin perder pesos ni redondear importes grandes", () => {
    expect(formatMoney(245000000n)).toContain("2.450.000");
    expect(formatMoney(900719925474100000n)).toContain("9.007.199.254.741.000");
  });
  it("conserva importes negativos y centavos", () => {
    expect(formatMoney(-3200050n)).toContain("-$");
    expect(formatMoney(-3200050n)).toContain("32.000,5");
  });
  it("presenta una nota almacenada en centésimas", () => expect(formatGrade(415)).toBe("4,15"));
  it("conserva todos los centavos de cualquier entero SQLite", () => {
    expect(formatMoney(9007199254740991n)).toContain("90.071.992.547.409,91");
    expect(formatMoney(9223372036854775807n)).toContain("92.233.720.368.547.758,07");
    expect(formatMoney(-1n)).toContain("0,01");
    expect(formatMoney(-1n)).toContain("-");
  });
});
describe("zona horaria académica", () => {
  it("respeta el día anterior en Bogotá cerca de medianoche UTC", () => {
    expect(localDateKey(new Date("2026-09-09T02:00:00Z"))).toBe("2026-09-08");
    expect(formatTime(new Date("2026-09-08T15:00:00Z"))).toBe("10:00");
  });
});
describe("resumen académico", () => {
  it("pondera notas y progreso por créditos", () => {
    expect(summarizeAcademics([{ credits: 4, currentGrade: 400, progress: 50 }, { credits: 2, currentGrade: 500, progress: 80 }]))
      .toEqual({ credits: 6, averageGrade: 433, progress: 60 });
  });
  it("representa ausencia de datos sin inventar un promedio", () => {
    expect(summarizeAcademics([])).toEqual({ credits: 0, averageGrade: null, progress: 0 });
  });
});
describe("datos de desarrollo e invariantes de persistencia", () => {
  it("mantiene las seis materias y todas las referencias de tareas", () => {
    expect(demoSubjects).toHaveLength(6);
    const ids = new Set(demoSubjects.map((subject) => subject.id));
    expect(demoTasks.every((task) => task.subjectId !== null && ids.has(task.subjectId))).toBe(true);
    expect(demoEvents.filter((event) => event.subjectId).every((event) => ids.has(event.subjectId!))).toBe(true);
    expect(demoTransactions.every((transaction) => transaction.amountMinor > 0n)).toBe(true);
  });
  it("rechaza notas, progreso y dificultad fuera de rango", () => {
    expect(subjectSchema.safeParse({ ...demoSubjects[0], currentGrade: 600 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...demoTasks[0], progress: 101 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...demoTasks[0], difficulty: 0 }).success).toBe(false);
  });
  it("rechaza tareas completadas sin progreso completo", () => {
    expect(taskSchema.safeParse({ ...demoTasks[0], status: "COMPLETED", progress: 65 }).success).toBe(false);
  });
  it("rechaza intervalos invertidos y fechas inválidas", () => {
    expect(eventSchema.safeParse({ ...demoEvents[0], endsAt: new Date("2026-09-08T14:00:00Z") }).success).toBe(false);
    expect(eventSchema.safeParse({ ...demoEvents[0], startsAt: new Date("invalid") }).success).toBe(false);
  });
  it("rechaza gastos negativos o mayores al entero SQLite de 64 bits", () => {
    expect(transactionSchema.safeParse({ ...demoTransactions[0], amountMinor: -1n }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...demoTransactions[0], amountMinor: 9223372036854775808n }).success).toBe(false);
  });
});
