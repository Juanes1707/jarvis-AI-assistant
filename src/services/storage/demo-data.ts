import { subjectSchema, taskSchema, eventSchema, transactionSchema } from "../../lib/database/validation";

export const demoSubjects = subjectSchema.array().parse([
  { id: "demo-calculo", name: "Cálculo Multivariable", professor: "Dra. Camila Torres", credits: 4, currentGrade: 430, targetGrade: 450, progress: 65, currentTopics: ["Multiplicadores de Lagrange", "Integrales múltiples"] },
  { id: "demo-redes", name: "Redes y Comunicación de Datos", professor: "Prof. Andrés Restrepo", credits: 3, currentGrade: 380, targetGrade: 430, progress: 58, currentTopics: ["Subnetting", "Protocolos de transporte"] },
  { id: "demo-bases", name: "Bases de Datos", professor: "Dra. Laura Méndez", credits: 3, currentGrade: 460, targetGrade: 470, progress: 72, currentTopics: ["SQL", "Normalización"] },
  { id: "demo-aleman", name: "Alemán A1", professor: "Prof. Clara Weber", credits: 2, currentGrade: 450, targetGrade: 450, progress: 70, currentTopics: ["Verbos modales", "Rutina diaria"] },
  { id: "demo-programacion", name: "Programación", professor: "Prof. Daniel Rojas", credits: 3, currentGrade: 440, targetGrade: 460, progress: 68, currentTopics: ["Estructuras de datos", "Pruebas unitarias"] },
  { id: "demo-micro", name: "Microcontroladores", professor: "Ing. Valentina Ruiz", credits: 3, currentGrade: 350, targetGrade: 400, progress: 45, currentTopics: ["Interrupciones", "Temporizadores"] },
]);
export const demoTasks = taskSchema.array().parse([
  { id: "demo-lagrange", title: "Terminar taller de Lagrange", subjectId: "demo-calculo", deadline: new Date("2026-09-09T19:00:00Z"), status: "IN_PROGRESS", priority: "HIGH", academicImpact: 30, difficulty: 4, estimatedMinutes: 90, progress: 65 },
  { id: "demo-subnetting", title: "Practicar ejercicios de subnetting", subjectId: "demo-redes", deadline: new Date("2026-09-11T22:00:00Z"), status: "TODO", priority: "HIGH", academicImpact: 20, difficulty: 4, estimatedMinutes: 60, progress: 20 },
  { id: "demo-sql", title: "Entregar consultas SQL", subjectId: "demo-bases", deadline: new Date("2026-09-14T23:00:00Z"), status: "TODO", priority: "MEDIUM", academicImpact: 15, difficulty: 3, estimatedMinutes: 45, progress: 0 },
]);
export const demoEvents = eventSchema.array().parse([
  { id: "demo-class-redes", title: "Redes y Comunicación de Datos", subjectId: "demo-redes", startsAt: new Date("2026-09-08T15:00:00Z"), endsAt: new Date("2026-09-08T17:00:00Z"), type: "CLASS", location: "Aula 402B", confirmed: true },
  { id: "demo-class-calculo", title: "Cálculo Multivariable", subjectId: "demo-calculo", startsAt: new Date("2026-09-08T19:00:00Z"), endsAt: new Date("2026-09-08T21:00:00Z"), type: "CLASS", location: "Aula 301", confirmed: true },
  { id: "demo-study-redes", title: "Práctica de subnetting", subjectId: "demo-redes", startsAt: new Date("2026-09-08T21:00:00Z"), endsAt: new Date("2026-09-08T22:00:00Z"), type: "STUDY", location: "Biblioteca", confirmed: true },
]);
export const demoTransactions = transactionSchema.array().parse([
  { id: "demo-income", title: "Ingreso mensual de ejemplo", amountMinor: 300000000n, type: "INCOME", category: "income", occurredAt: new Date("2026-09-01T17:00:00Z") },
  { id: "demo-food", title: "Almuerzo", amountMinor: 3200000n, type: "EXPENSE", category: "food", occurredAt: new Date("2026-09-08T17:00:00Z") },
  { id: "demo-transport", title: "Transporte de la semana", amountMinor: 6800000n, type: "EXPENSE", category: "transport", occurredAt: new Date("2026-09-07T12:00:00Z") },
  { id: "demo-materials", title: "Materiales de estudio", amountMinor: 15000000n, type: "EXPENSE", category: "education", occurredAt: new Date("2026-09-05T15:00:00Z") },
  { id: "demo-food-week", title: "Alimentación de la semana", amountMinor: 30000000n, type: "EXPENSE", category: "food", occurredAt: new Date("2026-09-06T18:00:00Z") },
]);
export const demoHabits = [
  { id: "demo-german", name: "Alemán", weeklyGoal: 5 },
  { id: "demo-study", name: "Estudio", weeklyGoal: 5 },
  { id: "demo-gym", name: "Gimnasio", weeklyGoal: 3 },
  { id: "demo-reading", name: "Lectura", weeklyGoal: 4 },
  { id: "demo-sleep", name: "Dormir 8 horas", weeklyGoal: 7 },
];

