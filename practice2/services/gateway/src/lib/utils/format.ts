/**
 * Format amount in kopecks to RUB currency string.
 */
export function formatAmount(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(kopecks / 100);
}

/**
 * Format date string to full date (e.g. "Mar 15, 2026").
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
}

/**
 * Format date string to short format (e.g. "15 Mar").
 */
export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short'
  }).format(new Date(dateStr));
}

/**
 * Format YYYY-MM string to month label (e.g. "Mar 2026").
 */
export function formatMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

/**
 * Format YYYY-MM string to month only label (e.g. "Mar").
 */
export function formatMonthShort(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const monthStr = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
    new Date(year, month - 1, 1)
  );
  return monthStr;
}

/**
 * Format YYYY-MM string to short chart label (e.g. "Jan '25").
 */
export function formatMonthChart(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const shortYear = String(year).slice(-2);
  const monthStr = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
    new Date(year, month - 1, 1)
  );
  return `${monthStr} '${shortYear}`;
}
