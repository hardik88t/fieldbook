import { computeTotals } from '@/domain/cart';
import { daysAgo } from '@/domain/dates';
import { NOW, openTestDatabase } from '@/testing/helpers';

import { buildSeedData, resetToSeed } from './seed';
import { prepareDatabase } from './bootstrap';

describe('buildSeedData', () => {
  const data = buildSeedData(NOW);

  it('creates 8 categories, each with products, and about 60 products overall', () => {
    expect(data.categories).toHaveLength(8);
    expect(data.products.length).toBeGreaterThanOrEqual(60);
    const used = new Set(data.products.map((p) => p.categoryId));
    expect(used.size).toBe(8);
  });

  it('gives every product a unique id and a positive integer paise price', () => {
    const ids = new Set(data.products.map((p) => p.id));
    expect(ids.size).toBe(data.products.length);
    for (const product of data.products) {
      expect(Number.isInteger(product.pricePaise)).toBe(true);
      expect(product.pricePaise).toBeGreaterThan(0);
    }
  });

  it('plans 7 stops for today, with the first two already done', () => {
    expect(data.stops).toHaveLength(7);
    expect(data.stops.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(data.stops.map((s) => s.visitState)).toEqual([
      'done',
      'done',
      'todo',
      'todo',
      'todo',
      'todo',
      'todo',
    ]);
    expect(new Set(data.stops.map((s) => s.visitDate))).toEqual(new Set(['2026-10-14']));
  });

  it('stores order totals that agree with their lines', () => {
    for (const order of data.orders) {
      const totals = computeTotals(order.lines);
      expect(order.subtotalPaise).toBe(totals.subtotalPaise);
      expect(order.gstPaise).toBe(totals.gstPaise);
      expect(order.totalPaise).toBe(totals.totalPaise);
    }
  });

  it('gives Sunrise Pharmacy a 9-line last order, for the Reorder banner', () => {
    const lastVisit = data.orders.find((o) => o.id === 'seed-cust-sunrise-0');
    expect(lastVisit?.lines).toHaveLength(9);
  });

  it('dates past orders in whole days before today', () => {
    const northgate = data.orders.filter(
      (o) => o.customerId === 'cust-northgate' && !o.id.includes('today'),
    );
    expect(northgate.length).toBeGreaterThan(0);
    for (const order of northgate) {
      expect(daysAgo(order.createdAt, NOW)).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a given clock', () => {
    expect(buildSeedData(NOW)).toEqual(buildSeedData(NOW));
  });
});

describe('seeding the database', () => {
  it('prepareDatabase seeds an empty database once and never duplicates on later starts', async () => {
    const { db } = await openTestDatabase({ seed: false });
    await prepareDatabase(db, NOW);
    await prepareDatabase(db, NOW);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM products')).toEqual({ n: 64 });
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM stops')).toEqual({ n: 7 });
  });

  it('resetToSeed clears customer data (carts, queued orders) and restores the demo', async () => {
    const { db } = await openTestDatabase();
    await db.run(
      "INSERT INTO cart_lines (customer_id, product_id, qty) VALUES ('cust-sunrise', 'rice-basmati-rice-gold', 3)",
    );
    await resetToSeed(db, NOW);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM cart_lines')).toEqual({ n: 0 });
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM products')).toEqual({ n: 64 });
  });
});
