import type { SqlDb } from '../sql';

export interface QueueItem {
  seq: number;
  orderId: string;
  idempotencyKey: string;
  attempts: number;
  /** Epoch milliseconds before which this item must not be attempted. null means due now. */
  nextAttemptAt: number | null;
  /** Parked items need a manual retry (see resetForRetry). They never block the queue. */
  parked: boolean;
  lastError: string | null;
}

export interface FailureUpdate {
  error: string;
  /** Epoch milliseconds for the next automatic attempt. Ignored when parked is true. */
  nextAttemptAt: number;
  parked: boolean;
}

export interface SyncQueueRepository {
  /** The oldest non-parked item (FIFO by insertion). */
  head(): Promise<QueueItem | null>;
  /** Items that are not parked, oldest first. */
  listActive(): Promise<QueueItem[]>;
  /** Number of items still waiting to be synced, including parked ones. */
  pendingCount(): Promise<number>;
  /** Earliest epoch ms at which a backed-off item becomes due, or null when nothing is scheduled. */
  nextWakeAt(): Promise<number | null>;
  recordFailure(orderId: string, update: FailureUpdate): Promise<void>;
  remove(orderId: string): Promise<void>;
  /** Clears backoff and parking, and resets the attempt counter, so the item is due immediately. */
  resetForRetry(orderId: string): Promise<void>;
}

interface QueueRow {
  seq: number;
  order_id: string;
  idempotency_key: string;
  attempts: number;
  next_attempt_at: number | null;
  parked: number;
  last_error: string | null;
}

function toItem(row: QueueRow): QueueItem {
  return {
    seq: row.seq,
    orderId: row.order_id,
    idempotencyKey: row.idempotency_key,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    parked: row.parked === 1,
    lastError: row.last_error,
  };
}

const COLUMNS = 'seq, order_id, idempotency_key, attempts, next_attempt_at, parked, last_error';

export function createSyncQueueRepository(db: SqlDb): SyncQueueRepository {
  return {
    async head() {
      const row = await db.first<QueueRow>(
        `SELECT ${COLUMNS} FROM sync_queue WHERE parked = 0 ORDER BY seq LIMIT 1`,
      );
      return row ? toItem(row) : null;
    },

    async listActive() {
      const rows = await db.all<QueueRow>(
        `SELECT ${COLUMNS} FROM sync_queue WHERE parked = 0 ORDER BY seq`,
      );
      return rows.map(toItem);
    },

    async pendingCount() {
      const row = await db.first<{ count: number }>('SELECT COUNT(*) AS count FROM sync_queue');
      return row?.count ?? 0;
    },

    async nextWakeAt() {
      const row = await db.first<{ wake: number | null }>(
        `SELECT MIN(next_attempt_at) AS wake FROM sync_queue
          WHERE parked = 0 AND next_attempt_at IS NOT NULL`,
      );
      return row?.wake ?? null;
    },

    async recordFailure(orderId, update) {
      await db.run(
        `UPDATE sync_queue
            SET attempts = attempts + 1,
                last_error = ?,
                parked = ?,
                next_attempt_at = ?
          WHERE order_id = ?`,
        [update.error, update.parked ? 1 : 0, update.parked ? null : update.nextAttemptAt, orderId],
      );
    },

    async remove(orderId) {
      await db.run('DELETE FROM sync_queue WHERE order_id = ?', [orderId]);
    },

    async resetForRetry(orderId) {
      await db.run(
        `UPDATE sync_queue SET attempts = 0, parked = 0, next_attempt_at = NULL, last_error = NULL
          WHERE order_id = ?`,
        [orderId],
      );
    },
  };
}
