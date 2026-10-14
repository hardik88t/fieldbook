import { ids, openTestDatabase, NOW } from '@/testing/helpers';

async function enqueue(
  repos: Awaited<ReturnType<typeof openTestDatabase>>['repos'],
  orderId: string,
) {
  await repos.cart.setQty(ids.northgateCustomer, ids.basmati, 1);
  await repos.orders.placeFromCart({
    orderId,
    customerId: ids.northgateCustomer,
    note: '',
    createdAt: NOW.toISOString(),
    visitDate: '2026-10-14',
  });
}

describe('sync queue repository', () => {
  it('serves the oldest item first, in insertion order', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    await enqueue(repos, 'ord-b');
    expect((await repos.syncQueue.head())?.orderId).toBe('ord-a');
    expect((await repos.syncQueue.listActive()).map((i) => i.orderId)).toEqual(['ord-a', 'ord-b']);
  });

  it('skips parked items when choosing the head', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    await enqueue(repos, 'ord-b');
    await repos.syncQueue.recordFailure('ord-a', { error: 'bad', nextAttemptAt: 0, parked: true });
    expect((await repos.syncQueue.head())?.orderId).toBe('ord-b');
    expect(await repos.syncQueue.pendingCount()).toBe(2);
  });

  it('records a failure with its backoff and attempt count', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    await repos.syncQueue.recordFailure('ord-a', {
      error: 'timeout',
      nextAttemptAt: 5000,
      parked: false,
    });
    const item = await repos.syncQueue.head();
    expect(item).toMatchObject({
      attempts: 1,
      nextAttemptAt: 5000,
      lastError: 'timeout',
      parked: false,
    });
    expect(await repos.syncQueue.nextWakeAt()).toBe(5000);
  });

  it('reports no wake time when nothing is backed off or parked', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    expect(await repos.syncQueue.nextWakeAt()).toBeNull();
  });

  it('resets backoff, parking and attempts for a manual retry', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    await repos.syncQueue.recordFailure('ord-a', { error: 'bad', nextAttemptAt: 0, parked: true });
    await repos.syncQueue.resetForRetry('ord-a');
    expect(await repos.syncQueue.head()).toMatchObject({
      orderId: 'ord-a',
      attempts: 0,
      parked: false,
      nextAttemptAt: null,
    });
  });

  it('removes an item once it is synced', async () => {
    const { repos } = await openTestDatabase();
    await enqueue(repos, 'ord-a');
    await repos.syncQueue.remove('ord-a');
    expect(await repos.syncQueue.pendingCount()).toBe(0);
  });
});
