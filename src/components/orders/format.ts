import { daysAgo } from '@/domain/dates';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Clock time as "9:42 am", the way the reference shows times. */
export function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'am' : 'pm';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/** Relative day for lists: "Today, 9:42 am", "Yesterday, 4:10 pm" or "12 Oct, 2:05 pm". */
export function formatOrderWhen(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const days = daysAgo(iso, now);
  const clock = formatClock(date);
  if (days === 0) return `Today, ${clock}`;
  if (days === 1) return `Yesterday, ${clock}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${clock}`;
}

/** Full date for the order detail: "12 Oct 2026, 2:05 pm". */
export function formatFullWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${formatClock(date)}`;
}

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

export interface FlushCounts {
  submitted: number;
  failed: number;
  remaining: number;
}

export interface FlushSummary {
  tone: 'success' | 'info' | 'danger';
  text: string;
}

/** The message shown after "Sync now" or a retry. Failures come first, because they need action. */
export function describeFlush(report: FlushCounts): FlushSummary {
  if (report.failed > 0) {
    return {
      tone: 'danger',
      text: `${plural(report.failed, 'order')} could not be sent. Tap Retry on the order to try again.`,
    };
  }
  if (report.submitted > 0) {
    return { tone: 'success', text: `${plural(report.submitted, 'order')} sent.` };
  }
  if (report.remaining > 0) {
    return { tone: 'info', text: 'Orders are waiting for their next attempt.' };
  }
  return { tone: 'info', text: 'Nothing to send. Everything is synced.' };
}
