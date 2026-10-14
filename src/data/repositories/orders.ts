import { computeTotals } from '@/domain/cart';
import type { Order, OrderLine, OrderStatus, OrderSummary } from '@/domain/types';
import { asPaise, multiplyPaise } from '@/money';

import { NotFoundError, type SqlDb } from '../sql';

export class EmptyCartError extends Error {
  constructor(customerId: string) {
    super(`Cannot place an order: the cart for ${customerId} is empty`);
    this.name = 'EmptyCartError';
  }
}

export interface PlaceOrderInput {
  /** Also used as the idempotency key when the order is sent to the server. */
  orderId: string;
  customerId: string;
  note: string;
  /** ISO timestamp the order was placed. */
  createdAt: string;
  /** Local day of the visit (YYYY-MM-DD). Its stop is marked done. */
  visitDate: string;
}

export interface OrderRepository {
  /**
   * Atomically: prices the cart at current product prices, writes the order with snapshot prices,
   * enqueues it for sync (status queued), clears the cart and marks the day's stop done.
   * Throws EmptyCartError when the cart has no lines.
   */
  placeFromCart(input: PlaceOrderInput): Promise<Order>;
  listSummaries(options?: { limit?: number }): Promise<OrderSummary[]>;
  getOrder(orderId: string): Promise<Order | null>;
  /**
   * The customer's most recent order with its lines. Pass `before` (ISO timestamp) to ignore
   * orders placed at or after it, for example to get the previous visit's order.
   */
  lastOrderForCustomer(customerId: string, options?: { before?: string }): Promise<Order | null>;
  setStatus(orderId: string, status: OrderStatus, lastError?: string | null): Promise<void>;
  /** After an app restart, orders left in "syncing" go back to "queued". Returns how many changed. */
  requeueInterrupted(): Promise<number>;
}

interface OrderRow {
  id: string;
  customer_id: string;
  customer_name: string;
  status: OrderStatus;
  note: string;
  subtotal_paise: number;
  gst_paise: number;
  total_paise: number;
  created_at: string;
  last_error: string | null;
}

interface ItemRow {
  order_id: string;
  product_id: string;
  product_name: string;
  pack: string;
  unit_price_paise: number;
  qty: number;
  line_paise: number;
}

const SUMMARY_SELECT = `
  SELECT o.id, o.customer_id, c.name AS customer_name, o.status, o.note,
         o.subtotal_paise, o.gst_paise, o.total_paise, o.created_at, o.last_error
    FROM orders o
    JOIN customers c ON c.id = o.customer_id`;

function toSummary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    createdAt: row.created_at,
    status: row.status,
    subtotalPaise: asPaise(row.subtotal_paise),
    gstPaise: asPaise(row.gst_paise),
    totalPaise: asPaise(row.total_paise),
    lastError: row.last_error,
  };
}

function toLine(row: ItemRow): OrderLine {
  return {
    productId: row.product_id,
    productName: row.product_name,
    pack: row.pack,
    unitPricePaise: asPaise(row.unit_price_paise),
    qty: row.qty,
    linePaise: asPaise(row.line_paise),
  };
}

export function createOrderRepository(db: SqlDb): OrderRepository {
  const loadItems = async (orderIds: string[]): Promise<Map<string, OrderLine[]>> => {
    const grouped = new Map<string, OrderLine[]>();
    for (const orderId of orderIds) {
      const rows = await db.all<ItemRow>(
        `SELECT order_id, product_id, product_name, pack, unit_price_paise, qty, line_paise
           FROM order_items WHERE order_id = ? ORDER BY line_no`,
        [orderId],
      );
      grouped.set(orderId, rows.map(toLine));
    }
    return grouped;
  };

  const withLines = async (summary: OrderSummary, note: string): Promise<Order> => {
    const items = await loadItems([summary.id]);
    return { ...summary, note, lines: items.get(summary.id) ?? [] };
  };

  const fetchOne = async (orderId: string) => {
    const row = await db.first<OrderRow>(`${SUMMARY_SELECT} WHERE o.id = ?`, [orderId]);
    return row;
  };

  return {
    async placeFromCart(input) {
      return db.transaction(async () => {
        const note = input.note.trim();
        const cartRows = await db.all<{
          product_id: string;
          name: string;
          pack: string;
          price_paise: number;
          qty: number;
        }>(
          `SELECT cl.product_id, p.name, p.pack, p.price_paise, cl.qty
             FROM cart_lines cl JOIN products p ON p.id = cl.product_id
            WHERE cl.customer_id = ?
            ORDER BY p.name`,
          [input.customerId],
        );
        if (cartRows.length === 0) throw new EmptyCartError(input.customerId);

        const lines: OrderLine[] = cartRows.map((row) => {
          const unit = asPaise(row.price_paise);
          return {
            productId: row.product_id,
            productName: row.name,
            pack: row.pack,
            unitPricePaise: unit,
            qty: row.qty,
            linePaise: multiplyPaise(unit, row.qty),
          };
        });
        const totals = computeTotals(
          lines.map((l) => ({ unitPricePaise: l.unitPricePaise, qty: l.qty })),
        );

        await db.run(
          `INSERT INTO orders (id, customer_id, status, note, subtotal_paise, gst_paise, total_paise, created_at, last_error)
           VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, NULL)`,
          [
            input.orderId,
            input.customerId,
            note,
            totals.subtotalPaise,
            totals.gstPaise,
            totals.totalPaise,
            input.createdAt,
          ],
        );
        for (const [index, line] of lines.entries()) {
          await db.run(
            `INSERT INTO order_items (order_id, line_no, product_id, product_name, pack, unit_price_paise, qty, line_paise)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              input.orderId,
              index + 1,
              line.productId,
              line.productName,
              line.pack,
              line.unitPricePaise,
              line.qty,
              line.linePaise,
            ],
          );
        }
        await db.run(
          `INSERT INTO sync_queue (order_id, idempotency_key, attempts, next_attempt_at, parked, last_error, created_at)
           VALUES (?, ?, 0, NULL, 0, NULL, ?)`,
          [input.orderId, input.orderId, input.createdAt],
        );
        await db.run('DELETE FROM cart_lines WHERE customer_id = ?', [input.customerId]);
        await db.run(
          `UPDATE stops SET visit_state = 'done' WHERE customer_id = ? AND visit_date = ?`,
          [input.customerId, input.visitDate],
        );

        const row = await fetchOne(input.orderId);
        if (!row) throw new NotFoundError('Order', input.orderId);
        return withLines(toSummary(row), note);
      });
    },

    async listSummaries(options = {}) {
      const limit = options.limit ?? 200;
      const rows = await db.all<OrderRow>(
        `${SUMMARY_SELECT} ORDER BY o.created_at DESC, o.id DESC LIMIT ?`,
        [limit],
      );
      return rows.map(toSummary);
    },

    async getOrder(orderId) {
      const row = await db.first<OrderRow>(`${SUMMARY_SELECT} WHERE o.id = ?`, [orderId]);
      if (!row) return null;
      return withLines(toSummary(row), row.note);
    },

    async lastOrderForCustomer(customerId, options = {}) {
      const row = options.before
        ? await db.first<OrderRow>(
            `${SUMMARY_SELECT} WHERE o.customer_id = ? AND o.created_at < ?
              ORDER BY o.created_at DESC, o.id DESC LIMIT 1`,
            [customerId, options.before],
          )
        : await db.first<OrderRow>(
            `${SUMMARY_SELECT} WHERE o.customer_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 1`,
            [customerId],
          );
      if (!row) return null;
      return withLines(toSummary(row), row.note);
    },

    async requeueInterrupted() {
      const result = await db.run(`UPDATE orders SET status = 'queued' WHERE status = 'syncing'`);
      return result.changes;
    },

    async setStatus(orderId, status, lastError = null) {
      const result = await db.run('UPDATE orders SET status = ?, last_error = ? WHERE id = ?', [
        status,
        lastError,
        orderId,
      ]);
      if (result.changes === 0) throw new NotFoundError('Order', orderId);
    },
  };
}
