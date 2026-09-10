import { z } from "zod";

const percentage = z.number().int().min(0).max(100);
export const taskProgressSchema = z.object({
  taskId: z.string().min(1).max(100),
  progress: z.string().trim().regex(/^\d{1,3}$/).transform(Number).pipe(percentage),
});
export const subjectSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1).max(180),
  professor: z.string().trim().min(1), credits: z.number().int().min(1).max(12),
  currentGrade: z.number().int().min(0).max(500), targetGrade: z.number().int().min(0).max(500),
  progress: percentage, currentTopics: z.array(z.string().min(1)),
});
export const taskSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1).max(240), subjectId: z.string().min(1).nullable(),
  deadline: z.date().nullable(), status: z.enum(["INBOX", "TODO", "IN_PROGRESS", "COMPLETED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), academicImpact: percentage,
  difficulty: z.number().int().min(1).max(5), estimatedMinutes: z.number().int().positive(),
  progress: percentage,
}).refine((task) => (task.status === "COMPLETED") === (task.progress === 100), "El estado completado debe corresponder al progreso del 100%.");
export const eventSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1), subjectId: z.string().optional(),
  startsAt: z.date(), endsAt: z.date(), type: z.enum(["CLASS", "STUDY", "TASK", "EXAM", "PERSONAL", "HABIT"]),
  location: z.string().optional(), confirmed: z.boolean(),
}).refine((event) => event.endsAt > event.startsAt, "El fin debe ser posterior al inicio.");
export const transactionSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1), amountMinor: z.bigint().positive().max(9223372036854775807n),
  type: z.enum(["INCOME", "EXPENSE"]), category: z.string().min(1), occurredAt: z.date(),
});
