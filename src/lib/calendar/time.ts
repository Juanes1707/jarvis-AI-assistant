/** The first local version uses Bogotá (UTC−05:00, no DST).
 * Civil dates are deliberately separate from UTC instants. */
export function bogotaDayBounds(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Fecha civil inválida.");
  const start = new Date(`${date}T00:00:00-05:00`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date) throw new Error("Fecha civil inválida.");
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
export function weekStart(date: string) {
  const day = bogotaDayBounds(date).start;
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * 86_400_000).toISOString().slice(0, 10);
}
export function monthBounds(date: string) {
  const { start } = bogotaDayBounds(date);
  const year = start.getUTCFullYear(), month = start.getUTCMonth();
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month + 1, 1, 5));
  return { start: bogotaDayBounds(first).start, end: next, daysRemaining: Math.round((next.getTime() - start.getTime()) / 86_400_000) };
}
type Interval = { startsAt: Date; endsAt: Date };
export function findFreeBlocks(events: Interval[], windowStart: Date, windowEnd: Date, minimumMinutes = 30) {
  if (!Number.isFinite(windowStart.getTime()) || !Number.isFinite(windowEnd.getTime()) || windowEnd < windowStart || !Number.isFinite(minimumMinutes) || minimumMinutes <= 0) throw new Error("Ventana de disponibilidad inválida.");
  if (events.some((event) => !Number.isFinite(event.startsAt.getTime()) || !Number.isFinite(event.endsAt.getTime()) || event.endsAt <= event.startsAt)) throw new Error("La agenda contiene un intervalo inválido.");
  const busy = events.filter((event) => event.endsAt > windowStart && event.startsAt < windowEnd).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const free: Interval[] = [];
  let cursor = windowStart.getTime();
  const end = windowEnd.getTime();
  for (const event of busy) {
    const start = Math.max(windowStart.getTime(), event.startsAt.getTime());
    if (start - cursor >= minimumMinutes * 60_000) free.push({ startsAt: new Date(cursor), endsAt: new Date(start) });
    cursor = Math.max(cursor, Math.min(end, event.endsAt.getTime()));
  }
  if (end - cursor >= minimumMinutes * 60_000) free.push({ startsAt: new Date(cursor), endsAt: new Date(end) });
  return free;
}
