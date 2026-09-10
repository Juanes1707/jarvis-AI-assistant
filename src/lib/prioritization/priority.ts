export interface PriorityTask {
  deadline: Date | null;
  academicImpact: number;
  difficulty: number;
  estimatedMinutes: number;
  progress: number;
  status: string;
}
export function calculatePriorityScore(task: PriorityTask, now: Date, nextExam: Date | null = null) {
  if (![now.getTime(), task.academicImpact, task.difficulty, task.estimatedMinutes, task.progress].every(Number.isFinite) || (task.deadline && !Number.isFinite(task.deadline.getTime())) || (nextExam && !Number.isFinite(nextExam.getTime()))) throw new Error("Datos de prioridad inválidos.");
  if (task.status === "COMPLETED" || task.progress >= 100) return { score: 0, reasons: ["Tarea completada."] };
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const hours = task.deadline ? (task.deadline.getTime() - now.getTime()) / 3_600_000 : Infinity;
  const urgency = !task.deadline ? 0 : hours <= 0 ? 1 : hours <= 24 ? .95 : hours <= 72 ? .75 : hours <= 168 ? .45 : hours <= 336 ? .2 : .05;
  const remaining = (100 - clamp(task.progress, 0, 100)) / 100;
  const examDays = nextExam ? (nextExam.getTime() - now.getTime()) / 86_400_000 : Infinity;
  const exam = examDays >= 0 && examDays <= 7 ? (8 - examDays) / 8 : 0;
  const score = Math.round(45 * urgency + 20 * clamp(task.academicImpact, 0, 100) / 100 + 10 * clamp(task.difficulty - 1, 0, 4) / 4 + 10 * clamp(task.estimatedMinutes * remaining / 120, 0, 1) + 10 * remaining + 5 * exam);
  const reasons = [
    task.deadline ? hours < 0 ? "La entrega está vencida." : hours === 0 ? "La entrega vence ahora." : hours <= 24 ? "La entrega vence en menos de 24 horas." : `Entrega en ${Math.ceil(hours / 24)} días.` : "Sin fecha de entrega.",
    `Representa ${task.academicImpact}% de la nota.`,
    `Completada al ${task.progress}%; quedan aproximadamente ${Math.ceil(task.estimatedMinutes * remaining)} minutos.`,
  ];
  if (exam > 0) reasons.push(`Examen relacionado en ${Math.ceil(examDays)} días.`);
  return { score: clamp(score, 0, 100), reasons };
}
