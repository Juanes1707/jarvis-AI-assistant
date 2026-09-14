import type { AcademicTask, Transaction, Workspace } from "../../domain/models";
import { buildDashboard } from "../../engines/dashboard";
import { bogotaDayBounds } from "../../lib/calendar/time";
import { formatMoney, localDateKey } from "../../lib/utils/format";
import { createTaskDraft, parseTaskDraft } from "../../domain/task-draft";
import { resolveDashboardCommand } from "../dashboard/command";
import { normalizeCommand, parsePesoAmount } from "./money";

export type JarvisAction =
  | { type: "add_transaction"; transaction: Transaction }
  | { type: "create_task"; task: AcademicTask }
  | { type: "complete_task" | "start_task"; taskId: string }
  | { type: "complete_habit"; habitId: string; date: string };
export type CommandProposal = { id: string; title: string; detail: string; action: JarvisAction };
export type CommandResult = { kind: "reply"; message: string } | { kind: "proposal"; proposal: CommandProposal } | { kind: "confirm" | "cancel" };
const reply = (message: string): CommandResult => ({ kind: "reply", message });
const help = "Puedo registrar gastos e ingresos, crear tareas en Inbox, iniciar o completar tareas y marcar hábitos de hoy. Prueba «Agrega un gasto de cien mil pesos hoy en transporte».";
const amountHint = "Indícame un importe positivo en pesos. Por ejemplo: «Agrega un gasto de 100.000 pesos hoy». Para centavos, usa «100.000,50».";

function transactionCommand(rest: string, type: Transaction["type"], now: Date, id: string): CommandResult {
  const boundary = rest.search(/\s+(?:pesos|persos|cop|hoy|ayer|anteayer|manana|el|al|para|en|por|de|del|a)\b/);
  const amount = boundary < 0 ? rest : rest.slice(0, boundary);
  const amountMinor = parsePesoAmount(amount);
  if (amountMinor === null) return reply(amountHint);
  let suffix = boundary < 0 ? "" : rest.slice(boundary).trim();
  suffix = suffix.replace(/^(?:pesos|persos|cop)\b\s*/, "");
  const dayMatches = [...suffix.matchAll(/\b(?:hoy|ayer|anteayer|manana|\d{4}-\d{2}-\d{2})\b/g)];
  if (dayMatches.length > 1) return reply("Indícame una sola fecha para el movimiento.");
  const datePhrase = dayMatches[0]?.[0] ?? "hoy";
  if (datePhrase === "manana") return reply("Puedo registrar movimientos de hoy o de días anteriores. Dime la fecha en que ocurrió el gasto o ingreso.");
  let date: string;
  try {
    date = /^\d{4}/.test(datePhrase) ? datePhrase : localDateKey(new Date(now.getTime() - (datePhrase === "ayer" ? 1 : datePhrase === "anteayer" ? 2 : 0) * 86400000));
    bogotaDayBounds(date);
    if (date > localDateKey(now)) return reply("Ese movimiento tiene una fecha futura. Indícame cuándo ocurrió.");
  } catch { return reply("La fecha no es válida. Puedes decir hoy, ayer o escribir una fecha como 2026-09-10."); }
  suffix = suffix.replace(/\b(?:(?:al|el|para el|para|del) )?(?:dia de )?(?:hoy|ayer|anteayer|\d{4}-\d{2}-\d{2})\b/, "").trim();
  let title = type === "EXPENSE" ? "Gasto registrado con JARVIS" : "Ingreso registrado con JARVIS";
  let category = type === "EXPENSE" ? "other" : "income";
  if (suffix) {
    const description = /^(?:en|por|de) (.+)$/.exec(suffix);
    if (!description || /\b(?:y|otro|otra|excepto|menos|mas|no|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\d/.test(description[1])) return reply("No pude separar el importe, la fecha y el concepto. Prueba «Agrega un gasto de cien mil pesos hoy en transporte». Registremos un movimiento a la vez.");
    title = description[1].trim();
    if (title.length > 180) return reply("Usa un concepto de hasta 180 caracteres.");
    if (type === "EXPENSE") {
      if (/almuerzo|comida|alimentacion|cafe|restaurante|mercado/.test(title)) category = "food";
      else if (/transporte|bus|taxi|uber|gasolina/.test(title)) category = "transport";
      else if (/estudio|material|libro|universidad/.test(title)) category = "education";
    }
  }
  const occurredAt = date === localDateKey(now) ? new Date(now) : new Date(bogotaDayBounds(date).start.getTime() + 12 * 3600000);
  return { kind: "proposal", proposal: { id, title: type === "EXPENSE" ? "Registrar gasto" : "Registrar ingreso", detail: `${formatMoney(amountMinor)} COP · ${date} (Bogotá)\n${title}`, action: { type: "add_transaction", transaction: { id, title, type, category, amountMinor, occurredAt } } } };
}

export function interpretCommand(input: string, workspace: Workspace, now: Date, id: string): CommandResult {
  const text = normalizeCommand(input).replace(/[¿?¡!]/g, "").replace(/\.$/, "").replace(/^(?:oye,? )?jarvis[, ]+/, "").replace(/^por favor[, ]+|[, ]+por favor$/, "").trim();
  if (!text || text.length > 1000) return reply("Dime una orden o pregunta de hasta 1.000 caracteres.");
  if (/^(?:si[, ]+)?(?:confirmar|confirmo|confirma|guardar|guardalo|adelante|si)$/.test(text)) return { kind: "confirm" };
  if (/^(?:cancelar|cancela|no|no guardes|no lo guardes)$/.test(text)) return { kind: "cancel" };
  if (/^no\b/.test(text)) return reply("Entendido. No realizaré ese cambio.");
  const transaction = /^(?:agrega|anade|registra|anota) (?:un |el |mi )?(gasto|ingreso)(?: de| por)?\s+(.+)$/.exec(text);
  if (transaction) return transactionCommand(transaction[2], transaction[1] === "gasto" ? "EXPENSE" : "INCOME", now, id);
  const past = /^(gaste|recibi) (.+)$/.exec(text);
  if (past) return transactionCommand(past[2], past[1] === "gaste" ? "EXPENSE" : "INCOME", now, id);
  const task = /^(?:agrega|anade|crea|anota) (?:una |la )?tarea(?: llamada| titulada)?\s+(.+)$/.exec(text);
  if (task) {
    const title = task[1].replace(/^[:"“]+|["”]+$/g, "").trim();
    if (/\b(?:hoy|ayer|manana|a las|para el|el lunes|el martes|el miercoles|el jueves|el viernes|el sabado|el domingo)\b/.test(title)) return reply("Por ahora creo tareas en Inbox sin fecha. Dime solo el título y después puedes añadir la fecha desde Tareas.");
    if (!title || title.length > 240) return reply("La tarea necesita un título de entre 1 y 240 caracteres.");
    return { kind: "proposal", proposal: { id, title: "Crear tarea", detail: `${title}\nInbox · sin fecha ni materia · estimación inicial: 30 min`, action: { type: "create_task", task: parseTaskDraft({ ...createTaskDraft(), title }, id) } } };
  }
  const existingTask = /^(completa|completar|inicia|iniciar|empieza|marca como completada) (?:la )?tarea\s+(.+)$/.exec(text);
  if (existingTask) {
    const query = existingTask[2].replace(/^["“]|["”]$/g, "");
    const exact = workspace.tasks.filter(item => normalizeCommand(item.title) === query);
    const tasks = exact.length ? exact : workspace.tasks.filter(item => normalizeCommand(item.title).includes(query));
    if (tasks.length !== 1) return reply(tasks.length ? `Encontré varias tareas: ${tasks.map(t => t.title).join("; ")}. Dime el título completo.` : "No encontré esa tarea. Dime su título tal como aparece en Tareas.");
    if (tasks[0].status === "COMPLETED") return reply("Esa tarea ya está completada.");
    const complete = /complet/.test(existingTask[1]);
    return { kind: "proposal", proposal: { id, title: complete ? "Completar tarea" : "Iniciar tarea", detail: `${tasks[0].title}\n${complete ? "Progreso: 100%" : "Estado: en curso; conservar progreso"}`, action: { type: complete ? "complete_task" : "start_task", taskId: tasks[0].id } } };
  }
  const habit = /^(?:completa|marca|registra) (?:el |mi )?habito (.+?)(?: como completado)?(?: hoy)?$/.exec(text);
  if (habit) {
    const habits = workspace.habits.filter(item => normalizeCommand(item.name) === habit[1]);
    if (habits.length !== 1) return reply(`Dime uno de tus hábitos: ${workspace.habits.map(h => h.name).join(", ")}.`);
    const date = localDateKey(now);
    if (workspace.habitEntries.some(entry => entry.habitId === habits[0].id && entry.date === date)) return reply("Ese hábito ya está marcado para hoy.");
    return { kind: "proposal", proposal: { id, title: "Completar hábito", detail: `${habits[0].name} · ${date} (Bogotá)`, action: { type: "complete_habit", habitId: habits[0].id, date } } };
  }
  if (/^(?:agrega|anade|registra|anota|crea|gaste|recibi|completa|marca|inicia|empieza|elimina|borra|cambia|modifica|mueve|reprograma)\b/.test(text)) return reply(help);
  return reply(resolveDashboardCommand(text, buildDashboard(workspace, now).context));
}
