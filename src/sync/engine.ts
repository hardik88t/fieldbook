import type { Repositories } from '@/data/repositories';
import type { Order } from '@/domain/types';

import { backoffDelayMs, MAX_ATTEMPTS } from './backoff';
import { TransportError, type SubmitOrderPayload, type SyncTransport } from './types';

export interface FlushReport {
  submitted: number;
  failed: number;
  /** Orders that were parked during this flush (need a manual retry). */
  parked: number;
  /** Items still in the queue after the flush, including parked ones. */
  remaining: number;
  /** Epoch ms when the next automatic attempt is due, if a flush stopped on backoff. */
  blockedUntil: number | null;
}

export interface SyncEngineOptions {
  repos: Pick<Repositories, 'orders' | 'syncQueue'>;
  transport: SyncTransport;
  /** Epoch milliseconds. Injected for tests. */
  now?: () => number;
  maxAttempts?: number;
  backoff?: (attempt: number) => number;
  /** Called after every write, so the UI can re-read. */
  notify?: () => void;
}

export function toSubmitPayload(order: Order): SubmitOrderPayload {
  return {
    orderId: order.id,
    customerId: order.customerId,
    note: order.note,
    createdAt: order.createdAt,
    lines: order.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      qty: line.qty,
      unitPricePaise: line.unitPricePaise,
      linePaise: line.linePaise,
    })),
    subtotalPaise: order.subtotalPaise,
    gstPaise: order.gstPaise,
    totalPaise: order.totalPaise,
  };
}

function describeError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof TransportError) {
    return { message: error.message, retryable: error.retryable };
  }
  const message = error instanceof Error ? error.message : 'Unknown sync error';
  return { message, retryable: true };
}

/**
 * Sends queued orders to the server, oldest first.
 *
 * - Single flight: overlapping flush() calls share one run, and a call made mid-run triggers one
 *   more pass afterwards, so nothing enqueued during a run is left behind.
 * - A transient failure (retryable) records the attempt, sets a backoff and stops the run, so
 *   later orders never overtake an earlier one.
 * - A rejection (not retryable), or MAX_ATTEMPTS transient failures, parks that order. Parked
 *   orders no longer block the queue and wait for retry().
 * - Every send carries the order id as the idempotency key, so a retry after a lost response
 *   cannot create a duplicate order on the server.
 */
export class SyncEngine {
  private readonly repos: SyncEngineOptions['repos'];
  private readonly transport: SyncTransport;
  private readonly now: () => number;
  private readonly maxAttempts: number;
  private readonly backoff: (attempt: number) => number;
  private readonly notify: () => void;
  private inFlight: Promise<FlushReport> | null = null;
  private rerunRequested = false;

  constructor(options: SyncEngineOptions) {
    this.repos = options.repos;
    this.transport = options.transport;
    this.now = options.now ?? (() => Date.now());
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
    this.backoff = options.backoff ?? ((attempt) => backoffDelayMs(attempt));
    this.notify = options.notify ?? (() => undefined);
  }

  /** Sends everything that is due. Resolves with what happened. */
  flush(): Promise<FlushReport> {
    if (this.inFlight) {
      this.rerunRequested = true;
      return this.inFlight;
    }
    const run = (async () => {
      try {
        let report = await this.drain();
        while (this.rerunRequested) {
          this.rerunRequested = false;
          report = await this.drain();
        }
        return report;
      } finally {
        // No await between the loop check and this line, so a late flush() cannot be lost.
        this.inFlight = null;
      }
    })();
    this.inFlight = run;
    return run;
  }

  /** Resets one order (clears backoff and parking) and sends it straight away. */
  async retry(orderId: string): Promise<FlushReport> {
    await this.repos.syncQueue.resetForRetry(orderId);
    await this.repos.orders.setStatus(orderId, 'queued', null);
    this.notify();
    return this.flush();
  }

  /** Call once on app start, before the first flush, to recover orders left mid-send. */
  async recoverAfterRestart(): Promise<number> {
    const changed = await this.repos.orders.requeueInterrupted();
    if (changed > 0) this.notify();
    return changed;
  }

  /** When the next backed-off attempt is due (epoch ms), or null when nothing is waiting on a timer. */
  nextWakeAt(): Promise<number | null> {
    return this.repos.syncQueue.nextWakeAt();
  }

  private async drain(): Promise<FlushReport> {
    const { orders, syncQueue } = this.repos;
    const report: FlushReport = {
      submitted: 0,
      failed: 0,
      parked: 0,
      remaining: 0,
      blockedUntil: null,
    };

    for (;;) {
      const item = await syncQueue.head();
      if (!item) break;

      if (item.nextAttemptAt !== null && item.nextAttemptAt > this.now()) {
        report.blockedUntil = item.nextAttemptAt;
        break;
      }

      const order = await orders.getOrder(item.orderId);
      if (!order) {
        // The order was deleted. Drop the orphaned queue row.
        await syncQueue.remove(item.orderId);
        continue;
      }

      await orders.setStatus(order.id, 'syncing', null);
      this.notify();

      try {
        await this.transport.submitOrder({
          idempotencyKey: item.idempotencyKey,
          order: toSubmitPayload(order),
        });
        await syncQueue.remove(order.id);
        await orders.setStatus(order.id, 'synced', null);
        report.submitted += 1;
        this.notify();
      } catch (error) {
        const failure = describeError(error);
        const attempts = item.attempts + 1;
        const park = !failure.retryable || attempts >= this.maxAttempts;
        const nextAttemptAt = this.now() + this.backoff(attempts);
        await syncQueue.recordFailure(order.id, {
          error: failure.message,
          nextAttemptAt,
          parked: park,
        });
        await orders.setStatus(order.id, 'failed', failure.message);
        report.failed += 1;
        this.notify();

        if (park) {
          report.parked += 1;
          continue;
        }
        report.blockedUntil = nextAttemptAt;
        break;
      }
    }

    report.remaining = await syncQueue.pendingCount();
    return report;
  }
}
