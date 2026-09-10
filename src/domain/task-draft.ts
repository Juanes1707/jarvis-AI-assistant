import { z } from "zod";
import type { AcademicTask } from "./models";
import { taskSchema } from "../lib/database/validation";

export type TaskDraft = {
  title: string; subjectId: string | null; deadline: Date | null;
  academicImpact: string; difficulty: string; estimatedMinutes: string; progress: string;
};
const whole = (min: number, max: number, label: string) => z.string().trim()
  .regex(/^\d+$/, `${label}: usa un número entero.`).transform(Number)
  .pipe(z.number().int().min(min, `${label}: mínimo ${min}.`).max(max, `${label}: máximo ${max}.`));
const formSchema = z.object({
  title: z.string().trim().min(1, "Escribe un título.").max(240, "El título es demasiado largo."),
  subjectId: z.string().min(1).nullable(), deadline: z.date().nullable(),
  academicImpact: whole(0, 100, "Impacto"), difficulty: whole(1, 5, "Dificultad"),
  estimatedMinutes: whole(1, 10080, "Tiempo estimado"), progress: whole(0, 100, "Progreso"),
});
export function createTaskDraft(task?: AcademicTask): TaskDraft {
  return {
    title: task?.title ?? "", subjectId: task?.subjectId ?? null, deadline: task?.deadline ?? null,
    academicImpact: String(task?.academicImpact ?? 0), difficulty: String(task?.difficulty ?? 3),
    estimatedMinutes: String(task?.estimatedMinutes ?? 30), progress: String(task?.progress ?? 0),
  };
}
export function parseTaskDraft(draft: TaskDraft, id: string, previousStatus?: AcademicTask["status"]): AcademicTask {
  const parsed = formSchema.parse(draft);
  const status = resolveTaskStatus(parsed, previousStatus);
  return taskSchema.parse({ id, ...parsed, status, priority: parsed.academicImpact >= 30 ? "HIGH" : "MEDIUM" });
}
export function resolveTaskStatus(task: Pick<AcademicTask, "progress" | "deadline" | "subjectId">, previousStatus?: AcademicTask["status"]): AcademicTask["status"] {
  if (task.progress === 100) return "COMPLETED";
  if (task.progress > 0 || previousStatus === "IN_PROGRESS") return "IN_PROGRESS";
  return !task.subjectId || !task.deadline ? "INBOX" : "TODO";
}
