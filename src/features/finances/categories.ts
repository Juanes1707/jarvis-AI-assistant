/**
 * Spanish names for the category slugs both stores use. The on-device command parser and the
 * backend's structured extraction agree on these keys, so one map covers every surface.
 */
const LABELS: Record<string, string> = {
  food: "Alimentación",
  transport: "Transporte",
  services: "Servicios",
  education: "Educación",
  leisure: "Ocio",
  health: "Salud",
  housing: "Vivienda",
  income: "Ingresos",
  other: "Otros",
};

export function categoryLabel(slug: string): string {
  return LABELS[slug] ?? slug.charAt(0).toLocaleUpperCase("es") + slug.slice(1);
}
