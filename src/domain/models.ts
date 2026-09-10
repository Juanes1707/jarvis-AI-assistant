import type { z } from "zod";
import type { eventSchema, subjectSchema, taskSchema, transactionSchema } from "../lib/database/validation";

export type User = { id: string; name: string; semester: number; timezone: string };
export type Subject = z.infer<typeof subjectSchema>;
export type AcademicTask = z.infer<typeof taskSchema>;
export type CalendarEvent = z.infer<typeof eventSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Exam = { id: string; subjectId: string; title: string; startsAt: Date; weight: number };
export type StudySession = { id: string; subjectId: string; startsAt: Date; minutes: number; completed: boolean };
export type Budget = { id: string; month: string; amountMinor: bigint };
export type FinancialGoal = { id: string; title: string; targetMinor: bigint; savedMinor: bigint };
export type Habit = { id: string; name: string; weeklyGoal: number };
export type HabitEntry = { habitId: string; date: string };
export type Project = { id: string; title: string; deadline: Date | null };
export type ProjectTask = { id: string; projectId: string; title: string; completed: boolean };
export type Milestone = { id: string; projectId: string; title: string; deadline: Date };
export type Document = { id: string; title: string; category: "university" | "projects" | "finance" | "personal"; tags: string[]; subjectId?: string; uri?: string };
export type Notification = { id: string; title: string; readAt: Date | null };
export type JarvisInsight = { id: string; title: string; reason: string; severity: "info" | "warning" | "critical" | "success" };
export type JarvisSuggestedAction = { id: string; title: string; reason: string; action: "open_task" | "open_finances" | "open_calendar"; targetId?: string; priority: "high" | "medium" | "low"; domain: "academic" | "finance" | "productivity" };
export type JarvisConversation = { id: string; title: string; createdAt: Date };
export type JarvisMessage = { id: string; conversationId: string; role: "user" | "assistant"; content: string; createdAt: Date };
export type Workspace = {
  user: User; subjects: Subject[]; tasks: AcademicTask[]; events: CalendarEvent[];
  transactions: Transaction[]; budget: Budget | null; habits: Habit[]; habitEntries: HabitEntry[]; exams: Exam[];
};
