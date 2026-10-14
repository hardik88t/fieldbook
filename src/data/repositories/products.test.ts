import { asPaise } from '@/money';
import { ids, NOW, openTestDatabase } from '@/testing/helpers';

describe('product repository', () => {
  it('lists categories in sort order', async () => {
    const { repos } = await openTestDatabase();
    const categories = await repos.products.listCategories();
    expect(categories.map((c) => c.name)).toEqual([
      'Rice',
      'Oil & Ghee',
      'Spices',
      'Snacks',
      'Pulses',
      'Tea & Coffee',
      'Biscuits',
      'Personal Care',
    ]);
  });

  it('filters products by category', async () => {
    const { repos } = await openTestDatabase();
    const rice = await repos.products.listProducts({ categoryId: 'rice' });
    expect(rice).toHaveLength(8);
    expect(rice.every((p) => p.categoryId === 'rice')).toBe(true);
  });

  it('searches names case-insensitively', async () => {
    const { repos } = await openTestDatabase();
    const results = await repos.products.listProducts({ query: 'BASMATI' });
    expect(results.map((p) => p.id)).toEqual([ids.basmati]);
  });

  it('matches the category name as well as the product name', async () => {
    const { repos } = await openTestDatabase();
    const results = await repos.products.listProducts({ query: 'spices' });
    expect(results).toHaveLength(8);
  });

  it('ignores diacritics in product names', async () => {
    const { db, repos } = await openTestDatabase();
    await db.run(
      `INSERT INTO products (id, category_id, name, pack, price_paise, tone, glyph)
       VALUES ('snacks-jalebi', 'snacks', 'Jalébi Mix', '200 g pack', 9000, 'peach', 'bag')`,
    );
    const results = await repos.products.listProducts({ query: 'jalebi' });
    expect(results.map((p) => p.name)).toEqual(['Jalébi Mix']);
  });

  it('returns integer paise prices', async () => {
    const { repos } = await openTestDatabase();
    const oil = await repos.products.getProduct(ids.sunflowerOil);
    expect(oil?.pricePaise).toBe(asPaise(42000));
  });

  it('returns null for an unknown product', async () => {
    const { repos } = await openTestDatabase();
    expect(await repos.products.getProduct('nope')).toBeNull();
  });

  it('is unaffected by the clock', async () => {
    const { repos } = await openTestDatabase({ now: NOW });
    expect(await repos.products.listProducts()).toHaveLength(64);
  });
});
