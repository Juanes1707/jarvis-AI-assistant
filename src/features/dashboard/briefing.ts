export interface BriefingInput {
  classes: number;
  pendingTasks: number;
  freeMinutes: number;
  priorityTitle: string | null;
}
export function generateDailyBriefing(input: BriefingInput) {
  const classes = input.classes === 1 ? "1 clase" : `${input.classes} clases`;
  const tasks = input.pendingTasks === 1 ? "1 tarea pendiente" : `${input.pendingTasks} tareas pendientes`;
  const free = input.freeMinutes ? ` Tu bloque libre más largo es de ${Math.round(input.freeMinutes)} minutos.` : " No hay bloques libres de al menos 30 minutos en tu jornada.";
  return `Hoy tienes ${classes} y ${tasks}.${free}${input.priorityTitle ? ` Tu prioridad sugerida es: ${input.priorityTitle}.` : " No hay tareas pendientes para priorizar."}`;
}
