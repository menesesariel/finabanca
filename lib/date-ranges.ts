export interface DateRange {
  id: string;
  label: string;
  getRange: () => { start: Date; end: Date };
}

export const DATE_RANGES: DateRange[] = [
  {
    id: "last-week",
    label: "Última semana",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  {
    id: "last-month",
    label: "Último mes",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return { start, end };
    },
  },
  {
    id: "last-3-months",
    label: "Últimos 3 meses",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return { start, end };
    },
  },
  {
    id: "last-6-months",
    label: "Últimos 6 meses",
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return { start, end };
    },
  },
  {
    id: "this-year",
    label: "Este año",
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    },
  },
];

export function getDateRangeById(id: string): DateRange | undefined {
  return DATE_RANGES.find((range) => range.id === id);
}

export function formatDateForGmail(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

