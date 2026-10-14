import { SCHEMA_V1 } from './schema';
import type { SqlDb } from './sql';

export interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

/** Ordered, append-only. Each migration runs once, inside a transaction, and bumps PRAGMA user_version. */
export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'initial schema', statements: SCHEMA_V1 },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function readSchemaVersion(db: SqlDb): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Brings the database up to LATEST_SCHEMA_VERSION. Idempotent: running it again is a no-op.
 * Throws if the database is newer than this app understands (downgrades are not supported).
 */
export async function migrate(db: SqlDb): Promise<number> {
  const current = await readSchemaVersion(db);
  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Database schema v${current} is newer than this app (v${LATEST_SCHEMA_VERSION}). Update the app.`,
    );
  }
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.transaction(async () => {
      for (const statement of migration.statements) {
        await db.exec(statement);
      }
      await db.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return readSchemaVersion(db);
}
