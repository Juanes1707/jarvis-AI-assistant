import { describe, expect, it } from "@jest/globals";
import { mapBackendWorkspace } from "../src/services/backend/workspace";
import type { BackendUserProfile, BackendWorkspace } from "../src/services/backend/client";
import type { Workspace } from "../src/domain/models";

const local: Workspace = {
  user: { id: "demo-owner", name: "Demo", semester: 4, timezone: "America/Bogota" },
  subjects: [], tasks: [], events: [], transactions: [], budget: null,
  habits: [{ id: "real-habit", name: "Leer", weeklyGoal: 5 }],
  habitEntries: [{ habitId: "real-habit", date: "2026-09-16" }], exams: [],
};

const profile: BackendUserProfile = {
  user_id: "owner", preferred_name: "Juanes", timezone: "America/Bogota",
  onboarding_completed: true,
};

const snapshot: BackendWorkspace = {
  subjects: [{
    id: "subject-1", name: "Bases de Datos", professor: null, credits: 3, active: true,
    created_at: "2026-09-16T12:00:00Z", updated_at: "2026-09-16T12:00:00Z",
  }],
  tasks: [{
    id: "task-1", title: "Modelo relacional", status: "PENDING", priority: "HIGH",
    due_at: "2026-09-20T18:00:00Z", subject_id: "subject-1", subject_name: "Bases de Datos",
  }],
  events: [{
    id: "event-1", title: "Entrega", starts_at: "2026-09-20T18:00:00Z",
    ends_at: "2026-09-20T19:00:00Z", event_type: "DEADLINE", confirmed: true,
    subject_id: "subject-1", subject_name: "Bases de Datos",
  }],
  transactions: [{
    id: "transaction-1", type: "EXPENSE", amount_minor: 3250000, currency: "COP",
    merchant: "Almuerzo", category: "food", occurred_at: "2026-09-16T17:00:00Z",
    source: "manual", created_at: "2026-09-16T17:00:00Z",
  }],
  budget: {
    id: "budget-1", month: "2026-09", amount_minor: 200000000, currency: "COP",
    created_at: "2026-09-16T12:00:00Z", updated_at: "2026-09-16T12:00:00Z",
  },
};

describe("mapeo del workspace PostgreSQL", () => {
  it("convierte los contratos del backend al modelo móvil y conserva solo datos locales propios", () => {
    const result = mapBackendWorkspace(local, profile, snapshot);

    expect(result.user.name).toBe("Juanes");
    expect(result.subjects[0]).toMatchObject({ id: "subject-1", professor: "Sin profesor", credits: 3 });
    expect(result.tasks[0]).toMatchObject({ subjectId: "subject-1", status: "TODO", progress: 0 });
    expect(result.tasks[0]?.deadline).toEqual(new Date("2026-09-20T18:00:00Z"));
    expect(result.events[0]).toMatchObject({ subjectId: "subject-1", type: "TASK" });
    expect(result.transactions[0]).toMatchObject({ title: "Almuerzo", amountMinor: 3250000n });
    expect(result.budget).toMatchObject({ id: "budget-1", amountMinor: 200000000n });
    expect(result.habits).toEqual(local.habits);
  });
});
