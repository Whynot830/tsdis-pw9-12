/** Текущий календарный месяц YYYY-MM в UTC (серверная консистентность). */
export function yearMonthUtc(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Начало месяца (вкл.) и начало следующего месяца (искл.) в UTC. */
export function monthBoundsUtc(yearMonth: string): { start: Date; endExclusive: Date } {
  const [ys, ms] = yearMonth.split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, endExclusive };
}

export function isSpendingOverLimit(spentKopecks: number, limitKopecks: number): boolean {
  return spentKopecks > limitKopecks;
}
