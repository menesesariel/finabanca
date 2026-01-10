export interface MonthOption {
  value: string; // YYYY-MM format
  label: string;
  year: number;
  month: number;
}

/**
 * Get list of months with transactions
 */
export function getAvailableMonths(transactionDates: string[]): MonthOption[] {
  const monthsSet = new Set<string>();

  transactionDates.forEach((dateStr) => {
    const date = new Date(dateStr);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthsSet.add(monthKey);
  });

  // Add current month if not present
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  monthsSet.add(currentMonth);

  // Convert to array and sort descending
  const months = Array.from(monthsSet)
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => {
      const [year, month] = monthKey.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      const label = date.toLocaleDateString("es-CR", {
        month: "long",
        year: "numeric",
      });

      return {
        value: monthKey,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        year,
        month,
      };
    });

  return months;
}

/**
 * Get start and end dates for a month
 */
export function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
  return { start, end };
}

/**
 * Get previous month key
 */
export function getPreviousMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Format month for display
 */
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Get current month key
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

