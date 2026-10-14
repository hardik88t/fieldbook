import { daysAgo } from '@/domain/dates';
import type { OrderReference, StopView } from '@/domain/types';

/** Where a stop sits in today's route. Only one stop is `current` at a time. */
export type StopPhase = 'done' | 'current' | 'upcoming';

export interface RouteSummary {
  total: number;
  done: number;
  /** Stops not yet visited, including the current one. */
  left: number;
  /** The first planned stop that is not done yet, or null when the route is finished. */
  currentId: string | null;
  /** 0 to 1, for the progress bar. */
  progress: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Written out by hand so the text does not depend on the runtime's Intl data. */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** For example "Tuesday, 14 October". */
export function formatLongDate(now: Date): string {
  return `${WEEKDAYS[now.getDay()] ?? ''}, ${now.getDate()} ${MONTHS[now.getMonth()] ?? ''}`;
}

/** Counts done stops and finds the current one. Stops must already be in planned order. */
export function summarizeRoute(stops: readonly StopView[]): RouteSummary {
  const total = stops.length;
  const done = stops.filter((stop) => stop.visitState === 'done').length;
  const current = stops.find((stop) => stop.visitState === 'todo');
  return {
    total,
    done,
    left: total - done,
    currentId: current?.id ?? null,
    progress: total === 0 ? 0 : done / total,
  };
}

export function phaseOf(stop: StopView, currentId: string | null): StopPhase {
  if (stop.visitState === 'done') return 'done';
  return stop.id === currentId ? 'current' : 'upcoming';
}

/** Whole local days since the order, or null when there is no order. */
export function orderAgeDays(order: OrderReference | null, now: Date): number | null {
  return order ? daysAgo(order.createdAt, now) : null;
}

/** "Last order 9 days ago", "Last order 1 day ago", "Last order today" or "No previous order". */
export function lastOrderAgeLabel(order: OrderReference | null, now: Date): string {
  const days = orderAgeDays(order, now);
  if (days === null) return 'No previous order';
  if (days <= 0) return 'Last order today';
  if (days === 1) return 'Last order 1 day ago';
  return `Last order ${days} days ago`;
}

export function doneLabel(done: number): string {
  return `${done} done`;
}

/** "4 stops left", "1 stop left", "Route complete", or "No stops today" for an empty route. */
export function stopsLeftLabel(summary: RouteSummary): string {
  if (summary.total === 0) return 'No stops today';
  if (summary.left === 0) return 'Route complete';
  return `${summary.left} stop${summary.left === 1 ? '' : 's'} left`;
}
