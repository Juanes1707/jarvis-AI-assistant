export type CommandContext = { briefing: string; priority: string; finances: string; academic: string; tasks: string[] };
export function resolveDashboardCommand(input: string, context: CommandContext): string {
  const text = input.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!text) return "Escribe una pregunta sobre tus tareas, agenda, estudios o presupuesto.";
  if (/gastar|gasto|presupuesto|finanza|dinero|ahorro/.test(text)) return context.finances;
  if (/semestre|nota|promedio|academi|universidad/.test(text)) return context.academic;
  if (/estudi|prioridad|importante/.test(text)) return context.priority;
  if (/pendiente|tarea/.test(text)) return context.tasks.length ? `Pendientes: ${context.tasks.join("; ")}.` : "No tienes tareas pendientes.";
  if (/organiza|plan|dia|agenda|hoy/.test(text)) return context.briefing + " Esta es una recomendación; tu calendario no se ha modificado.";
  return "Puedo resumir tu agenda, explicar la tarea prioritaria y consultar el presupuesto o las notas. Prueba «¿Qué debería estudiar hoy?» o «¿Cuánto puedo gastar?».";
}
