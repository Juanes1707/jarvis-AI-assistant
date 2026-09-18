import type { CalendarEvent, Workspace } from "../../domain/models";
import type { BackendUserProfile, BackendWorkspace } from "./client";

function isDemoId(value: string | null | undefined) {
  return value?.startsWith("demo-") ?? false;
}

const eventTypes: Record<BackendWorkspace["events"][number]["event_type"], CalendarEvent["type"]> = {
  CLASS: "CLASS",
  STUDY: "STUDY",
  EXAM: "EXAM",
  PERSONAL: "PERSONAL",
  DEADLINE: "TASK",
  OTHER: "PERSONAL",
};

export function mapBackendWorkspace(
  local: Workspace,
  profile: BackendUserProfile | null,
  snapshot: BackendWorkspace,
): Workspace {
  const habits = local.habits.filter(item => !isDemoId(item.id));
  const habitIds = new Set(habits.map(item => item.id));
  return {
    user: {
      id: profile?.user_id ?? "server-owner",
      name: profile?.preferred_name || profile?.display_name || "Usuario",
      semester: snapshot.subjects.length ? local.user.semester : 0,
      timezone: profile?.timezone || "America/Bogota",
    },
    subjects: snapshot.subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      professor: subject.professor || "Sin profesor",
      credits: subject.credits,
      currentGrade: 0,
      targetGrade: 0,
      progress: 0,
      currentTopics: [],
    })),
    tasks: snapshot.tasks.map(task => ({
      id: task.id,
      title: task.title,
      subjectId: task.subject_id ?? null,
      deadline: task.due_at ? new Date(task.due_at) : null,
      status: task.status === "PENDING" ? "TODO" : task.status,
      priority: task.priority,
      academicImpact: 0,
      difficulty: 3,
      estimatedMinutes: 30,
      progress: task.status === "COMPLETED" ? 100 : 0,
    })),
    events: snapshot.events.map(event => ({
      id: event.id,
      title: event.title,
      ...(event.subject_id ? { subjectId: event.subject_id } : {}),
      startsAt: new Date(event.starts_at),
      endsAt: new Date(event.ends_at),
      type: eventTypes[event.event_type],
      ...(event.location ? { location: event.location } : {}),
      confirmed: event.confirmed,
    })),
    transactions: snapshot.transactions.map(transaction => ({
      id: transaction.id,
      title: transaction.merchant,
      amountMinor: BigInt(transaction.amount_minor),
      type: transaction.type,
      category: transaction.category,
      occurredAt: new Date(transaction.occurred_at),
    })),
    budget: snapshot.budget ? {
      id: snapshot.budget.id,
      month: snapshot.budget.month,
      amountMinor: BigInt(snapshot.budget.amount_minor),
    } : null,
    habits,
    habitEntries: local.habitEntries.filter(item => habitIds.has(item.habitId)),
    exams: [],
  };
}
