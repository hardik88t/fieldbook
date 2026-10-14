/**
 * Native database client (iOS and Android), backed by expo-sqlite.
 * Metro resolves client.web.ts instead on web, so this file is never bundled for web.
 */
import * as SQLite from 'expo-sqlite';

import { createSerialQueue, type SqlDb } from './sql';

const DATABASE_NAME = 'fieldbook.db';

export async function openAppDatabase(): Promise<SqlDb> {
  const raw = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await raw.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const serial = createSerialQueue();

  return {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params) => {
      const result = await raw.runAsync(sql, [...(params ?? [])]);
      return { changes: result.changes };
    },
    all: <T>(sql: string, params?: readonly (string | number | null)[]) =>
      raw.getAllAsync<T>(sql, [...(params ?? [])]),
    first: <T>(sql: string, params?: readonly (string | number | null)[]) =>
      raw.getFirstAsync<T>(sql, [...(params ?? [])]),
    transaction: <T>(work: () => Promise<T>) =>
      serial(async () => {
        let result: T | undefined;
        await raw.withTransactionAsync(async () => {
          result = await work();
        });
        return result as T;
      }),
  };
}
