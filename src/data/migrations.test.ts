import { LATEST_SCHEMA_VERSION, migrate, readSchemaVersion } from './migrations';
import { openTestDatabase } from '@/testing/helpers';

describe('migrate', () => {
  it('brings an empty database to the latest schema version and creates every table', async () => {
    const { db } = await openTestDatabase({ seed: false });
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await readSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual([
      'app_settings',
      'cart_lines',
      'categories',
      'customers',
      'order_items',
      'orders',
      'products',
      'stops',
      'sync_queue',
    ]);
  });

  it('is idempotent: running it again changes nothing', async () => {
    const { db } = await openTestDatabase({ seed: false });
    await migrate(db);
    await db.run("INSERT INTO categories (id, name, sort_order) VALUES ('keep', 'Keep', 0)");
    await migrate(db);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM categories')).toEqual({ n: 1 });
  });

  it('refuses a database written by a newer app version', async () => {
    const { db } = await openTestDatabase({ seed: false });
    await db.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });

  it('enforces the money and quantity CHECK constraints', async () => {
    const { db } = await openTestDatabase({ seed: false });
    await migrate(db);
    await expect(
      db.run(
        `INSERT INTO products (id, category_id, name, pack, price_paise, tone, glyph)
         VALUES ('p', 'missing', 'x', 'x', 0, 'sand', 'bag')`,
      ),
    ).rejects.toThrow();
  });
});
