const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day key, YYYY-MM-DD, for a Date. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole local calendar days between an ISO timestamp and `now` (0 = same day, negative = future). */
export function daysAgo(isoTimestamp: string, now: Date): number {
  const then = new Date(isoTimestamp);
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((startOfNow - startOfThen) / DAY_MS);
}

/** Midnight at the start of the local calendar day containing `date`. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Adds whole days to a Date, preserving the local time of day. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}
