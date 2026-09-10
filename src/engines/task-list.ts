import type { AcademicTask, CalendarEvent } from "../domain/models";
import { bogotaDayBounds } from "../lib/calendar/time";
export type TaskFilter = "pending" | "inbox" | "today" | "upcoming" | "in_progress" | "completed";
export const taskFilters: { id: TaskFilter; label: string }[] = [
  { id: "pending", label: "Pendientes" }, { id: "inbox", label: "Inbox" }, { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximas" }, { id: "in_progress", label: "En curso" }, { id: "completed", label: "Completadas" },
];
export function filterTasks(tasks: AcademicTask[], filter: TaskFilter, date: string) {
  const { start, end } = bogotaDayBounds(date);
  return tasks.filter(task => {
    if (filter === "completed") return task.status === "COMPLETED";
    if (task.status === "COMPLETED") return false;
    if (filter === "inbox") return task.status === "INBOX";
    if (filter === "today") return task.deadline !== null && task.deadline >= start && task.deadline < end;
    if (filter === "upcoming") return task.deadline !== null && task.deadline >= end;
    if (filter === "in_progress") return task.status === "IN_PROGRESS";
    return true;
  });
}
export function taskDeadlines(tasks: AcademicTask[]): CalendarEvent[] {
  return tasks.filter(task => task.status !== "COMPLETED" && task.deadline !== null).map(task => ({
    id: "deadline:" + task.id, title: "Entrega: " + task.title, subjectId: task.subjectId ?? undefined,
    startsAt: task.deadline!, endsAt: new Date(+task.deadline! + 60_000), type: "TASK", confirmed: true,
  }));
}
