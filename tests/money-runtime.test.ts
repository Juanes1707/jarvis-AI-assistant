import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { formatMoney } from "../src/lib/utils/format";
import { buildDashboard } from "../src/engines/dashboard";
import { demoSubjects, demoTasks, demoEvents, demoTransactions, demoHabits } from "../src/services/storage/demo-data";

describe("presentación monetaria con Intl de Hermes", () => {
  beforeEach(() => {
    const formatToParts = Intl.NumberFormat.prototype.formatToParts;
    jest.spyOn(Intl.NumberFormat.prototype, "formatToParts").mockImplementation(function (this: Intl.NumberFormat, value) {
      // Node accepts BigInt here, but the Expo Go Android runtime rejects it.
      if (typeof value !== "number") throw new TypeError("Cannot convert BigInt to number");
      return formatToParts.call(this, value);
    });
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it.each([
    [0n, "$ 0"],
    [1n, "$ 0,01"],
    [-1n, "-$ 0,01"],
    [50n, "$ 0,50"],
    [-50n, "-$ 0,50"],
    [100n, "$ 1"],
    [-100n, "-$ 1"],
    [99999n, "$ 999,99"],
    [100000n, "$ 1.000"],
    [245000000n, "$ 2.450.000"],
    [6304347n, "$ 63.043,47"],
    [9223372036854775807n, "$ 92.233.720.368.547.758,07"],
    [-9223372036854775808n, "-$ 92.233.720.368.547.758,08"],
  ])("muestra %s centavos sin redondeos ni errores nativos", (amount, expected) => {
    expect(formatMoney(amount).replace(/\s/g, " ")).toBe(expected);
  });

  it("conserva el símbolo de otra moneda", () => {
    expect(formatMoney(123456n, "USD").replace(/\s/g, " ")).toBe("US$ 1.234,56");
  });

  it("construye el resumen inicial que usa WorkspaceProvider", () => {
    const dashboard = buildDashboard({
      user: { id: "test-juan", name: "Juan", semester: 4, timezone: "America/Bogota" },
      subjects: demoSubjects, tasks: demoTasks, events: demoEvents,
      transactions: demoTransactions, habits: demoHabits, habitEntries: [], exams: [],
      budget: { id: "test-budget", month: "2026-09", amountMinor: 200000000n },
    });
    expect(dashboard.finance.balance).toBe(245000000n);
    expect(dashboard.context.finances).toContain("2.450.000");
    expect(dashboard.context.finances).toContain("63.043,47");
  });
});
