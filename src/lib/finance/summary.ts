export function calculateRemainingBudget(budgetMinor: bigint | null, spendingMinor: bigint): bigint | null {
  return budgetMinor === null ? null : budgetMinor - spendingMinor;
}
export function calculateDailySafeSpend(remainingMinor: bigint | null, daysRemaining: number): bigint | null {
  if (remainingMinor === null) return null;
  if (!Number.isInteger(daysRemaining) || daysRemaining < 1) throw new RangeError("El período debe incluir al menos un día.");
  return remainingMinor <= 0n ? 0n : remainingMinor / BigInt(daysRemaining);
}
export function calculateSavingsRate(incomeMinor: bigint, expensesMinor: bigint): number | null {
  if (incomeMinor <= 0n) return null;
  return Number(((incomeMinor - expensesMinor) * 10_000n) / incomeMinor) / 100;
}
