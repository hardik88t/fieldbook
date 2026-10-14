import type { Customer, StopView, VisitState } from '@/domain/types';
import { asPaise } from '@/money';

import type { SqlDb } from '../sql';

export interface StopRepository {
  /** Today's route (or any local day, YYYY-MM-DD) in planned order. */
  listForDate(visitDate: string): Promise<StopView[]>;
  getCustomer(customerId: string): Promise<Customer | null>;
  setVisitState(stopId: string, state: VisitState): Promise<void>;
}

interface StopViewRow {
  id: string;
  customer_id: string;
  visit_date: string;
  planned_time: string;
  position: number;
  visit_state: VisitState;
  customer_name: string;
  customer_area: string;
  last_order_id: string | null;
  last_order_total_paise: number | null;
  last_order_created_at: string | null;
}

export function createStopRepository(db: SqlDb): StopRepository {
  return {
    async listForDate(visitDate) {
      const rows = await db.all<StopViewRow>(
        `SELECT s.id, s.customer_id, s.visit_date, s.planned_time, s.position, s.visit_state,
                c.name AS customer_name, c.area AS customer_area,
                lo.id AS last_order_id,
                lo.total_paise AS last_order_total_paise,
                lo.created_at AS last_order_created_at
           FROM stops s
           JOIN customers c ON c.id = s.customer_id
           LEFT JOIN orders lo ON lo.id = (
             SELECT o.id FROM orders o
              WHERE o.customer_id = s.customer_id
              ORDER BY o.created_at DESC
              LIMIT 1
           )
          WHERE s.visit_date = ?
          ORDER BY s.position`,
        [visitDate],
      );
      return rows.map((row) => ({
        id: row.id,
        customerId: row.customer_id,
        visitDate: row.visit_date,
        plannedTime: row.planned_time,
        position: row.position,
        visitState: row.visit_state,
        customer: { id: row.customer_id, name: row.customer_name, area: row.customer_area },
        lastOrder:
          row.last_order_id && row.last_order_created_at && row.last_order_total_paise !== null
            ? {
                id: row.last_order_id,
                totalPaise: asPaise(row.last_order_total_paise),
                createdAt: row.last_order_created_at,
              }
            : null,
      }));
    },

    async getCustomer(customerId) {
      const row = await db.first<{ id: string; name: string; area: string }>(
        'SELECT id, name, area FROM customers WHERE id = ?',
        [customerId],
      );
      return row ? { id: row.id, name: row.name, area: row.area } : null;
    },

    async setVisitState(stopId, state) {
      await db.run('UPDATE stops SET visit_state = ? WHERE id = ?', [state, stopId]);
    },
  };
}
