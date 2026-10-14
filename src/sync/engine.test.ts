import { createRepositories, type Repositories } from '@/data/repositories';
import { ids, NOW, openTestDatabase } from '@/testing/helpers';

import { backoffDelayMs } from './backoff';
import { FakeTransport } from './fakeTransport';
import { SyncEngine } from './engine';
import type { SubmitOrderRequest, SyncTransport } from './types';

interface Harness {
  repos: Repositories;
  transport: FakeTransport;
  engine: SyncEngine;
  notify: jest.Mock;
  now: () => number;
  advance: (ms: number) => void;
  enqueue: (orderId: string) => Promise<void>;
}

async function harness(
  options: { maxAttempts?: number; transport?: SyncTransport } = {},
): Promise<Harness> {
  const { db } = await openTestDatabase();
  const repos = createRepositories(db);
  let clock = NOW.getTime();
  const transport = new FakeTransport({
    latencyMs: 0,
    sleep: async () => undefined,
    now: () => new Date(clock),
  });
  const notify = jest.fn();
  const engine = new SyncEngine({
    repos,
    transport: options.transport ?? transport,
    now: () => clock,
    maxAttempts: options.maxAttempts,
    notify,
  });
  return {
    repos,
    transport,
    engine,
    notify,
    now: () => clock,
    advance: (ms) => {
      clock += ms;
    },
    enqueue: async (orderId) => {
      await repos.cart.setQty(ids.northgateCustomer, ids.basmati, 2);
      await repos.orders.placeFromCart({
        orderId,
        customerId: ids.northgateCustomer,
        note: '',
        createdAt: new Date(clock).toISOString(),
        visitDate: '2026-10-14',
      });
    },
  };
}

const statusOf = async (h: Harness, orderId: string) =>
  (await h.repos.orders.getOrder(orderId))?.status;

describe('SyncEngine', () => {
  it('sends queued orders oldest first and marks them synced', async () => {
    const h = await harness();
    await h.enqueue('ord-1');
    await h.enqueue('ord-2');

    const report = await h.engine.flush();

    expect(report).toMatchObject({ submitted: 2, failed: 0, remaining: 0, blockedUntil: null });
    expect(h.transport.serverOrders().map((o) => o.idempotencyKey)).toEqual(['ord-1', 'ord-2']);
    expect(await statusOf(h, 'ord-1')).toBe('synced');
    expect(await statusOf(h, 'ord-2')).toBe('synced');
  });

  it('leaves orders queued when nothing has been attempted yet (offline use)', async () => {
    const h = await harness();
    await h.enqueue('ord-1');
    expect(await statusOf(h, 'ord-1')).toBe('queued');
    expect(h.transport.callCount).toBe(0);
  });

  it('sends orders that were queued offline once the connection returns', async () => {
    const h = await harness();
    h.transport.setOnline(false);
    await h.enqueue('ord-1');

    const offlineReport = await h.engine.flush();
    expect(offlineReport.failed).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('failed');

    h.transport.setOnline(true);
    h.advance(backoffDelayMs(1));
    const onlineReport = await h.engine.flush();
    expect(onlineReport.submitted).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('synced');
  });

  it('on a transient failure, records the error, stops the run so later orders do not overtake', async () => {
    const h = await harness();
    h.transport.failNext('server');
    await h.enqueue('ord-1');
    await h.enqueue('ord-2');

    const report = await h.engine.flush();

    expect(report).toMatchObject({ submitted: 0, failed: 1, blockedUntil: h.now() + 2000 });
    expect(h.transport.callCount).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('failed');
    expect((await h.repos.orders.getOrder('ord-1'))?.lastError).toBe('Server error, try again');
    expect(await statusOf(h, 'ord-2')).toBe('queued');
  });

  it('does not attempt a backed-off order before its delay has passed', async () => {
    const h = await harness();
    h.transport.failNext('server');
    await h.enqueue('ord-1');
    await h.engine.flush();

    h.advance(1999);
    await h.engine.flush();
    expect(h.transport.callCount).toBe(1);

    h.advance(1);
    const report = await h.engine.flush();
    expect(report.submitted).toBe(1);
    expect(h.transport.callCount).toBe(2);
  });

  it('doubles the delay with each consecutive failure', async () => {
    const h = await harness();
    h.transport.failNext('server', 'server', 'server');
    await h.enqueue('ord-1');

    await h.engine.flush();
    h.advance(2000);
    await h.engine.flush();
    h.advance(4000);
    const third = await h.engine.flush();

    expect(third.blockedUntil).toBe(h.now() + 8000);
    expect((await h.repos.syncQueue.head())?.attempts).toBe(3);
  });

  it('parks an order the server rejects, and keeps sending the orders behind it', async () => {
    const h = await harness();
    h.transport.failNext('rejected');
    await h.enqueue('ord-1');
    await h.enqueue('ord-2');

    const report = await h.engine.flush();

    expect(report).toMatchObject({ submitted: 1, failed: 1, parked: 1, remaining: 1 });
    expect(await statusOf(h, 'ord-1')).toBe('failed');
    expect(await statusOf(h, 'ord-2')).toBe('synced');
    expect(await h.repos.syncQueue.listActive()).toEqual([]);
  });

  it('does not resend a parked order on its own, but does after a manual retry', async () => {
    const h = await harness();
    h.transport.failNext('rejected');
    await h.enqueue('ord-1');
    await h.engine.flush();
    const callsAfterPark = h.transport.callCount;

    h.advance(60 * 60_000);
    await h.engine.flush();
    expect(h.transport.callCount).toBe(callsAfterPark);

    const retried = await h.engine.retry('ord-1');
    expect(retried.submitted).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('synced');
    expect(await h.repos.syncQueue.pendingCount()).toBe(0);
  });

  it('parks an order after maxAttempts transient failures', async () => {
    const h = await harness({ maxAttempts: 2 });
    h.transport.failNext('server', 'server');
    await h.enqueue('ord-1');

    await h.engine.flush();
    h.advance(backoffDelayMs(1));
    const report = await h.engine.flush();

    expect(report.parked).toBe(1);
    expect(await h.repos.syncQueue.head()).toBeNull();
    expect(await h.repos.syncQueue.pendingCount()).toBe(1);
  });

  it('does not create a duplicate order when a response is lost after the server accepted it', async () => {
    const h = await harness();
    h.transport.failNext('timeout-after-commit');
    await h.enqueue('ord-1');

    await h.engine.flush();
    expect(h.transport.serverOrderCount()).toBe(1);

    h.advance(backoffDelayMs(1));
    const report = await h.engine.flush();

    expect(report.submitted).toBe(1);
    expect(h.transport.serverOrderCount()).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('synced');
    expect(h.transport.getServerOrder('ord-1')?.idempotencyKey).toBe('ord-1');
  });

  it('shares one run between overlapping flush calls', async () => {
    const h = await harness();
    await h.enqueue('ord-1');
    await h.enqueue('ord-2');

    const first = h.engine.flush();
    const second = h.engine.flush();
    await Promise.all([first, second]);

    expect(h.transport.serverOrderCount()).toBe(2);
    expect(h.transport.callCount).toBe(2);
  });

  it('sends an order enqueued while a run is in progress', async () => {
    const h = await harness();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let gated = true;
    const slowTransport: SyncTransport = {
      submitOrder: async (req: SubmitOrderRequest) => {
        if (gated) {
          gated = false;
          await gate;
        }
        return h.transport.submitOrder(req);
      },
    };
    const engine = new SyncEngine({ repos: h.repos, transport: slowTransport, now: h.now });
    await h.enqueue('ord-1');

    const run = engine.flush();
    await h.enqueue('ord-2');
    const again = engine.flush();
    release();
    await Promise.all([run, again]);

    expect(h.transport.serverOrders().map((o) => o.idempotencyKey)).toEqual(['ord-1', 'ord-2']);
  });

  it('recovers orders left in "syncing" after an app restart', async () => {
    const h = await harness();
    await h.enqueue('ord-1');
    await h.repos.orders.setStatus('ord-1', 'syncing');

    expect(await h.engine.recoverAfterRestart()).toBe(1);
    expect(await statusOf(h, 'ord-1')).toBe('queued');
  });

  it('reports when the next backed-off attempt is due', async () => {
    const h = await harness();
    h.transport.failNext('server');
    await h.enqueue('ord-1');
    await h.engine.flush();
    expect(await h.engine.nextWakeAt()).toBe(h.now() + 2000);
  });

  it('notifies listeners as orders change state', async () => {
    const h = await harness();
    await h.enqueue('ord-1');
    await h.engine.flush();
    expect(h.notify.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
