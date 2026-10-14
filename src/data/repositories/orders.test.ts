import { computeTotals } from '@/domain/cart';
import { asPaise } from '@/money';
import { ids, NOW, openTestDatabase } from '@/testing/helpers';

import { EmptyCartError } from './orders';
import { NotFoundError } from '../sql';

const TODAY = '2026-10-14';

async function cartWithBasmatiAndOil(repos: Awaited<ReturnType<typeof openTestDatabase>>['repos']) {
  await repos.cart.setQty(ids.northgateCustomer, ids.basmati, 2);
  await repos.cart.setQty(ids.northgateCustomer, ids.sunflowerOil, 6);
  await repos.cart.setQty(ids.northgateCustomer, ids.desiGhee, 2);
}

describe('order repository: placeFromCart', () => {
  it('writes a queued order with totals from the cart and enqueues it under its own idempotency key', async () => {
    const { db, repos } = await openTestDatabase();
    await cartWithBasmatiAndOil(repos);

    const order = await repos.orders.placeFromCart({
      orderId: 'ord-test-1',
      customerId: ids.northgateCustomer,
      note: '  Leave at back door  ',
      createdAt: NOW.toISOString(),
      visitDate: TODAY,
    });

    expect(order.status).toBe('queued');
    expect(order.note).toBe('Leave at back door');
    expect(order.subtotalPaise).toBe(542000);
    expect(order.gstPaise).toBe(27100);
    expect(order.totalPaise).toBe(569100);
    expect(order.lines).toHaveLength(3);

    const queued = await db.first<{ idempotency_key: string; attempts: number; parked: number }>(
      'SELECT idempotency_key, attempts, parked FROM sync_queue WHERE order_id = ?',
      ['ord-test-1'],
    );
    expect(queued).toEqual({ idempotency_key: 'ord-test-1', attempts: 0, parked: 0 });
  });

  it('clears the cart and marks that day’s stop as done, in the same step', async () => {
    const { repos } = await openTestDatabase();
    await cartWithBasmatiAndOil(repos);
    await repos.orders.placeFromCart({
      orderId: 'ord-test-2',
      customerId: ids.northgateCustomer,
      note: '',
      createdAt: NOW.toISOString(),
      visitDate: TODAY,
    });
    expect(await repos.cart.listLines(ids.northgateCustomer)).toEqual([]);
    const stop = (await repos.stops.listForDate(TODAY)).find(
      (s) => s.customerId === ids.northgateCustomer,
    );
    expect(stop?.visitState).toBe('done');
  });

  it('refuses an empty cart and writes nothing', async () => {
    const { db, repos } = await openTestDatabase();
    await expect(
      repos.orders.placeFromCart({
        orderId: 'ord-empty',
        customerId: ids.northgateCustomer,
        note: '',
        createdAt: NOW.toISOString(),
        visitDate: TODAY,
      }),
    ).rejects.toBeInstanceOf(EmptyCartError);
    expect(
      await db.first<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE id = 'ord-empty'"),
    ).toEqual({ n: 0 });
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue')).toEqual({ n: 0 });
  });

  it('keeps the price it was placed at when the catalogue price changes later', async () => {
    const { db, repos } = await openTestDatabase();
    await repos.cart.setQty(ids.northgateCustomer, ids.basmati, 2);
    await repos.orders.placeFromCart({
      orderId: 'ord-snapshot',
      customerId: ids.northgateCustomer,
      note: '',
      createdAt: NOW.toISOString(),
      visitDate: TODAY,
    });
    await db.run('UPDATE products SET price_paise = 99999 WHERE id = ?', [ids.basmati]);

    const order = await repos.orders.getOrder('ord-snapshot');
    expect(order?.lines[0]?.unitPricePaise).toBe(57000);
    expect(order?.totalPaise).toBe(
      computeTotals([{ unitPricePaise: asPaise(57000), qty: 2 }]).totalPaise,
    );
  });
});

describe('order repository: reads and status', () => {
  it('lists orders newest first and honours the limit', async () => {
    const { repos } = await openTestDatabase();
    const all = await repos.orders.listSummaries();
    expect(all.length).toBeGreaterThan(2);
    const createdAt = all.map((o) => o.createdAt);
    expect([...createdAt].sort().reverse()).toEqual(createdAt);
    expect(await repos.orders.listSummaries({ limit: 2 })).toHaveLength(2);
  });

  it('returns the most recent order for a customer, with its lines', async () => {
    const { repos } = await openTestDatabase();
    const last = await repos.orders.lastOrderForCustomer(ids.sunriseCustomer);
    expect(last?.id).toBe('seed-today-cust-sunrise');
  });

  it('can skip orders placed on or after a cut-off, to find the previous visit', async () => {
    const { repos } = await openTestDatabase();
    const startOfToday = new Date(2026, 9, 14).toISOString();
    const previous = await repos.orders.lastOrderForCustomer(ids.sunriseCustomer, {
      before: startOfToday,
    });
    expect(previous?.id).toBe('seed-cust-sunrise-0');
    expect(previous?.lines).toHaveLength(9);
  });

  it('returns null for a customer with no orders', async () => {
    const { repos } = await openTestDatabase();
    expect(await repos.orders.lastOrderForCustomer('cust-none')).toBeNull();
  });

  it('updates status and records the error text', async () => {
    const { repos } = await openTestDatabase();
    await repos.orders.setStatus('seed-cust-sunrise-0', 'failed', 'Server error');
    const order = await repos.orders.getOrder('seed-cust-sunrise-0');
    expect(order).toMatchObject({ status: 'failed', lastError: 'Server error' });
  });

  it('throws NotFoundError when setting the status of an unknown order', async () => {
    const { repos } = await openTestDatabase();
    await expect(repos.orders.setStatus('missing', 'synced')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('moves orders stuck in "syncing" back to "queued" after a restart', async () => {
    const { repos } = await openTestDatabase();
    await repos.orders.setStatus('seed-cust-sunrise-0', 'syncing');
    expect(await repos.orders.requeueInterrupted()).toBe(1);
    expect((await repos.orders.getOrder('seed-cust-sunrise-0'))?.status).toBe('queued');
  });
});
