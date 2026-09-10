import type { Workspace, JarvisInsight, JarvisSuggestedAction } from "../domain/models";
import { calculatePriorityScore } from "../lib/prioritization/priority";
import { findFreeBlocks, bogotaDayBounds, monthBounds } from "../lib/calendar/time";
import { calculateDailySafeSpend, calculateRemainingBudget } from "../lib/finance/summary";
import { formatGrade, formatMoney, localDateKey } from "../lib/utils/format";
import { summarizeAcademics } from "../features/dashboard/summary";
import { generateDailyBriefing } from "../features/dashboard/briefing";

export const demoNow = new Date("2026-09-08T14:00:00-05:00");
export function buildDashboard(workspace: Workspace, now: Date = demoNow) {
  const date = localDateKey(now), day = bogotaDayBounds(date), month = monthBounds(date);
  const events = workspace.events.filter(e => e.startsAt < day.end && e.endsAt > day.start).sort((a, b) => +a.startsAt - +b.startsAt);
  const tasks = workspace.tasks.filter(t => t.status !== "COMPLETED").map(task => {
    const exam = workspace.exams.filter(e => e.subjectId === task.subjectId && e.startsAt >= now).sort((a, b) => +a.startsAt - +b.startsAt)[0];
    return { ...task, ranking: calculatePriorityScore(task, now, exam?.startsAt) };
  }).sort((a, b) => b.ranking.score - a.ranking.score);
  const priority = tasks[0] ?? null;
  const end = new Date(day.start.getTime() + 20 * 3_600_000);
  const free = end > now ? findFreeBlocks(events, now, end) : [];
  const freeMinutes = Math.max(0, ...free.map(e => (+e.endsAt - +e.startsAt) / 60000));
  const monthTransactions = workspace.transactions.filter(t => t.occurredAt >= month.start && t.occurredAt < month.end);
  const spent = monthTransactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amountMinor, 0n);
  const income = monthTransactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amountMinor, 0n);
  const balance = workspace.transactions.reduce((sum, t) => sum + (t.type === "INCOME" ? t.amountMinor : -t.amountMinor), 0n);
  const budget = workspace.budget?.month === date.slice(0, 7) ? workspace.budget.amountMinor : null;
  const remaining = calculateRemainingBudget(budget, spent);
  const daily = calculateDailySafeSpend(remaining, month.daysRemaining);
  const academic = summarizeAcademics(workspace.subjects);
  const briefing = generateDailyBriefing({ classes: events.filter(e => e.type === "CLASS").length, pendingTasks: tasks.length, freeMinutes, priorityTitle: priority?.title ?? null });
  const alerts: JarvisInsight[] = workspace.subjects.filter(s => s.currentGrade < s.targetGrade).map(s => ({ id: s.id, title: s.name, reason: `Nota ${formatGrade(s.currentGrade)} · meta ${formatGrade(s.targetGrade)}. Revisa tus próximos temas.`, severity: "warning" }));
  if (remaining !== null && remaining < 0n) alerts.unshift({ id: "budget", title: "Presupuesto superado", reason: `Has superado el presupuesto en ${formatMoney(-remaining)}.`, severity: "critical" });
  const suggestions: JarvisSuggestedAction[] = priority ? [{ id: "priority", title: `Continuar: ${priority.title}`, reason: priority.ranking.reasons.join(" "), action: "open_task", targetId: priority.id, priority: "high", domain: "academic" }] : [];
  return {
    date, events, tasks, priority, freeMinutes, briefing, academic, alerts, suggestions,
    finance: { balance, spent, income, budget, remaining, daily },
    context: {
      briefing, tasks: tasks.map(t => t.title),
      priority: priority ? `${priority.title}. ${priority.ranking.reasons.join(" ")}` : "No tienes tareas pendientes.",
      academic: academic.averageGrade === null ? "No hay notas registradas." : `Tu promedio ponderado es ${formatGrade(academic.averageGrade)} en ${academic.credits} créditos.`,
      finances: `Saldo: ${formatMoney(balance)}. Gastos del mes: ${formatMoney(spent)}. ${daily === null ? "No hay presupuesto mensual." : `Disponible por día según presupuesto: ${formatMoney(daily)}.`}`,
    },
  };
}
