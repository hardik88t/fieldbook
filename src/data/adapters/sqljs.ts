import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import { createSerialQueue, type SqlDb, type SqlValue } from '../sql';

export interface SqlJsHandle {
  db: SqlDb;
  /** Serialises the whole database file, for persistence on web. */
  exportBytes(): Uint8Array;
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

/** Loads the sql.js engine once. On web the wasm file is served from the app's public folder. */
export function loadSqlJs(wasmUrl?: string): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs(wasmUrl ? { locateFile: () => wasmUrl } : undefined);
  return sqlJsPromise;
}

/**
 * Wraps a sql.js Database in the async SqlDb interface. sql.js is synchronous, so each call
 * completes atomically; transactions are serialised so concurrent callers cannot interleave BEGIN.
 *
 * `onWrite` is awaited after every committed write (a single statement, or a transaction on
 * COMMIT), so a write resolves only once it is persisted. Writes inside an open transaction are not
 * reported until COMMIT, so a rollback never persists partial state.
 */
export function wrapSqlJs(
  raw: Database,
  options?: { onWrite?: () => Promise<void> | void },
): SqlDb {
  const serial = createSerialQueue();
  let inTransaction = false;
  const notifyWrite = async () => {
    if (!inTransaction) await options?.onWrite?.();
  };

  const runStatement = <T>(
    sql: string,
    params: readonly SqlValue[] | undefined,
    collect: boolean,
  ) => {
    const statement = raw.prepare(sql);
    try {
      if (params && params.length > 0) statement.bind([...params]);
      const rows: T[] = [];
      if (collect) {
        while (statement.step()) rows.push(statement.getAsObject() as T);
      } else {
        statement.step();
      }
      return rows;
    } finally {
      statement.free();
    }
  };

  const db: SqlDb = {
    exec: async (sql) => {
      raw.exec(sql);
      await notifyWrite();
    },
    run: async (sql, params) => {
      runStatement(sql, params, false);
      const changes = raw.getRowsModified();
      await notifyWrite();
      return { changes };
    },
    all: async <T>(sql: string, params?: readonly SqlValue[]) => runStatement<T>(sql, params, true),
    first: async <T>(sql: string, params?: readonly SqlValue[]) => {
      const rows = runStatement<T>(sql, params, true);
      return rows[0] ?? null;
    },
    transaction: <T>(work: () => Promise<T>) =>
      serial(async () => {
        raw.exec('BEGIN');
        inTransaction = true;
        let result: T;
        try {
          result = await work();
          raw.exec('COMMIT');
        } catch (error) {
          raw.exec('ROLLBACK');
          throw error;
        } finally {
          inTransaction = false;
        }
        await notifyWrite();
        return result;
      }),
  };
  return db;
}

/** Opens a sql.js database. Pass `data` to restore a previously exported file. */
export async function openSqlJsDatabase(options?: {
  wasmUrl?: string;
  data?: Uint8Array | null;
  onWrite?: () => Promise<void> | void;
}): Promise<SqlJsHandle> {
  const SQL = await loadSqlJs(options?.wasmUrl);
  const raw = options?.data ? new SQL.Database(options.data) : new SQL.Database();
  const db = wrapSqlJs(raw, { onWrite: options?.onWrite });
  await db.exec('PRAGMA foreign_keys = ON');
  return { db, exportBytes: () => raw.export() };
}
