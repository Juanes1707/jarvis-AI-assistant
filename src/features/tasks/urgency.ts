const DAY_MS = 24 * 3_600_000;

/**
 * Presentation-level urgency: whether a deadline has passed or lands within a day.
 * This is the only thing allowed to turn an element crimson (docs/DESIGN_SYNC.md §8).
 * Ranking and scheduling stay in the domain engines.
 */
export function isUrgent(deadline: Date | null, now: Date = new Date()): boolean {
  return deadline !== null && deadline.getTime() - now.getTime() <= DAY_MS;
}
