import { migrate } from './migrations';
import { resetToSeed } from './seed';
import type { SqlDb } from './sql';

/**
 * Runs on every app start. Migrates the schema, and seeds demo data only when the products
 * table is empty, so a fresh install always has a working route and catalogue.
 */
export async function prepareDatabase(db: SqlDb, now: Date): Promise<void> {
  await migrate(db);
  const row = await db.first<{ count: number }>('SELECT COUNT(*) AS count FROM products');
  if ((row?.count ?? 0) === 0) {
    await resetToSeed(db, now);
  }
}
