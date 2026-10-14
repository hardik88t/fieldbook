import type { OrderReference, StopView } from '@/domain/types';
import { asPaise } from '@/money';

import {
  doneLabel,
  formatLongDate,
  greetingFor,
  lastOrderAgeLabel,
  phaseOf,
  stopsLeftLabel,
  summarizeRoute,
} from './summary';

const NOW = new Date(2026, 9, 14, 9, 30);

function stop(
  id: string,
  visitState: StopView['visitState'],
  lastOrder: OrderReference | null = null,
): StopView {
  return {
    id,
    customerId: `cust-${id}`,
    visitDate: '2026-10-14',
    plannedTime: '09:10',
    position: 1,
    visitState,
    customer: { id: `cust-${id}`, name: `Shop ${id}`, area: 'Paldi' },
    lastOrder,
  };
}

describe('greetingFor', () => {
  it('greets by local hour', () => {
    expect(greetingFor(new Date(2026, 9, 14, 8))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 9, 14, 13))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 9, 14, 19))).toBe('Good evening');
  });
});

describe('formatLongDate', () => {
  it('writes the weekday, day and month in English without relying on Intl', () => {
    expect(formatLongDate(NOW)).toBe('Wednesday, 14 October');
    expect(formatLongDate(new Date(2026, 0, 1))).toBe('Thursday, 1 January');
  });
});

describe('summarizeRoute', () => {
  it('counts done and left stops and finds the first stop still to visit', () => {
    const summary = summarizeRoute([
      stop('a', 'done'),
      stop('b', 'done'),
      stop('c', 'todo'),
      stop('d', 'todo'),
      stop('e', 'todo'),
    ]);
    expect(summary).toEqual({ total: 5, done: 2, left: 3, currentId: 'c', progress: 0.4 });
  });

  it('has no current stop once the route is finished', () => {
    const summary = summarizeRoute([stop('a', 'done'), stop('b', 'done')]);
    expect(summary.currentId).toBeNull();
    expect(summary.left).toBe(0);
    expect(summary.progress).toBe(1);
  });

  it('handles an empty route', () => {
    expect(summarizeRoute([])).toEqual({
      total: 0,
      done: 0,
      left: 0,
      currentId: null,
      progress: 0,
    });
  });
});

describe('phaseOf', () => {
  it('marks done stops, the current stop and the rest as upcoming', () => {
    expect(phaseOf(stop('a', 'done'), 'b')).toBe('done');
    expect(phaseOf(stop('b', 'todo'), 'b')).toBe('current');
    expect(phaseOf(stop('c', 'todo'), 'b')).toBe('upcoming');
  });
});

describe('lastOrderAgeLabel', () => {
  const orderOn = (day: number): OrderReference => ({
    id: `order-${day}`,
    totalPaise: asPaise(100),
    createdAt: new Date(2026, 9, day, 10, 12).toISOString(),
  });

  it('says how many days ago the last order was', () => {
    expect(lastOrderAgeLabel(orderOn(5), NOW)).toBe('Last order 9 days ago');
    expect(lastOrderAgeLabel(orderOn(13), NOW)).toBe('Last order 1 day ago');
    expect(lastOrderAgeLabel(orderOn(14), NOW)).toBe('Last order today');
  });

  it('handles a shop with no previous order', () => {
    expect(lastOrderAgeLabel(null, NOW)).toBe('No previous order');
  });
});

describe('progress labels', () => {
  it('pluralises the stops left and names a finished or empty route', () => {
    const route = (total: number, done: number) =>
      summarizeRoute(
        Array.from({ length: total }, (_, index) =>
          stop(`s${index}`, index < done ? 'done' : 'todo'),
        ),
      );
    expect(doneLabel(2)).toBe('2 done');
    expect(stopsLeftLabel(route(6, 2))).toBe('4 stops left');
    expect(stopsLeftLabel(route(3, 2))).toBe('1 stop left');
    expect(stopsLeftLabel(route(3, 3))).toBe('Route complete');
    expect(stopsLeftLabel(route(0, 0))).toBe('No stops today');
  });
});
