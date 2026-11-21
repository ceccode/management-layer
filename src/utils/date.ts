export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateDaysAgo(days: number, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export function isWithinDays(dateStr: string, days: number, fromDate: Date = new Date()): boolean {
  const targetDate = new Date(dateStr);
  const cutoffDate = getDateDaysAgo(days, fromDate);
  return targetDate >= cutoffDate;
}
