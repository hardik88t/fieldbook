import { openSqlJsDatabase } from '@/data/adapters/sqljs';
import { prepareDatabase } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import type { SqlDb } from '@/data/sql';

/** Fixed clock for tests: Tuesday 14 October 2026, 09:30 local time. */
export const NOW = new Date(2026, 9, 14, 9, 30, 0);

export interface TestDatabase {
  db: SqlDb;
  repos: Repositories;
}

/** In-memory SQLite (sql.js) with the same schema as the app. Seeded unless `seed: false`. */
export async function openTestDatabase(
  options: { seed?: boolean; now?: Date } = {},
): Promise<TestDatabase> {
  const { db } = await openSqlJsDatabase();
  if (options.seed !== false) {
    await prepareDatabase(db, options.now ?? NOW);
  }
  return { db, repos: createRepositories(db) };
}

export const ids = {
  basmati: 'rice-basmati-rice-gold',
  sunflowerOil: 'oil-ghee-sunflower-oil',
  desiGhee: 'oil-ghee-desi-ghee',
  sunriseCustomer: 'cust-sunrise',
  northgateCustomer: 'cust-northgate',
  bluebirdCustomer: 'cust-bluebird',
} as const;
