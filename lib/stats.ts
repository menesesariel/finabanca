import { Transaction, CategoryId } from "./types";

/**
 * Currency-aware aggregation helpers.
 *
 * IMPORTANT: amounts in different currencies (CRC, USD, ...) must NEVER be
 * summed together. Every helper here works within a single currency, or
 * returns results broken down by currency. This is what keeps the money math
 * correct across the dashboard and reports.
 */

export interface CurrencyBucket {
  total: number;
  count: number;
}

/** List of distinct currencies present in the given transactions. */
export function getCurrencies(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((t) => set.add(t.currency));
  return Array.from(set);
}

/**
 * Pick a sensible default currency to display: the one with the most
 * transactions. Falls back to "CRC" when there are none.
 */
export function getPrimaryCurrency(transactions: Transaction[]): string {
  const byCurrency = groupByCurrency(transactions);
  const entries = Object.entries(byCurrency);
  if (entries.length === 0) return "CRC";
  return entries.sort((a, b) => b[1].count - a[1].count)[0][0];
}

/** Totals and counts grouped by currency. */
export function groupByCurrency(
  transactions: Transaction[]
): Record<string, CurrencyBucket> {
  const result: Record<string, CurrencyBucket> = {};
  transactions.forEach((t) => {
    if (!result[t.currency]) result[t.currency] = { total: 0, count: 0 };
    result[t.currency].total += t.amount;
    result[t.currency].count += 1;
  });
  return result;
}

/** Filter transactions down to a single currency. */
export function filterByCurrency(
  transactions: Transaction[],
  currency: string
): Transaction[] {
  return transactions.filter((t) => t.currency === currency);
}

/** Sum of amounts for a single currency. */
export function totalForCurrency(
  transactions: Transaction[],
  currency: string
): number {
  return filterByCurrency(transactions, currency).reduce(
    (sum, t) => sum + t.amount,
    0
  );
}

/** Category totals for a single currency (only categories with spend). */
export function categoryTotals(
  transactions: Transaction[],
  currency: string
): Record<CategoryId, number> {
  const totals = {} as Record<CategoryId, number>;
  filterByCurrency(transactions, currency).forEach((t) => {
    totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
  });
  return totals;
}

/** Monthly totals (YYYY-MM -> amount) for a single currency. */
export function monthlyTotals(
  transactions: Transaction[],
  currency: string
): Record<string, number> {
  const totals: Record<string, number> = {};
  filterByCurrency(transactions, currency).forEach((t) => {
    const date = new Date(t.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    totals[monthKey] = (totals[monthKey] || 0) + t.amount;
  });
  return totals;
}

/** Total spent in the current calendar month, for a single currency. */
export function thisMonthTotal(
  transactions: Transaction[],
  currency: string
): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return filterByCurrency(transactions, currency)
    .filter((t) => new Date(t.transactionDate) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0);
}
