import type { BackendMemoryKind } from "../../services/backend/client";

/**
 * The four kinds JARVIS stores, named the way a person would describe them rather than the way
 * the column is typed. The hues come from the identity palette, deliberately avoiding the system
 * cyan, the activity green and crimson so a memory never reads as a status (DESIGN_SYNC §8).
 */
export const MEMORY_KINDS: readonly {
  value: BackendMemoryKind; label: string; plural: string; note: string; color: string;
}[] = [
  {
    value: "fact", label: "Un hecho", plural: "Hechos", color: "#38bdf8",
    note: "Algo cierto sobre ti: dónde estudias, cuándo termina tu semestre.",
  },
  {
    value: "preference", label: "Una preferencia", plural: "Preferencias", color: "#a78bfa",
    note: "Cómo prefieres que trabaje: qué tono usar, cuándo no interrumpirte.",
  },
  {
    value: "goal", label: "Una meta", plural: "Metas", color: "#f472b6",
    note: "Algo que quieres lograr y que debería tener en cuenta al priorizar.",
  },
  {
    value: "constraint", label: "Un límite", plural: "Límites", color: "#fb923c",
    note: "Una restricción real: presupuesto, horario bloqueado, algo que no debe hacer.",
  },
];

export function memoryKind(kind: BackendMemoryKind) {
  return MEMORY_KINDS.find(item => item.value === kind) ?? MEMORY_KINDS[0];
}
