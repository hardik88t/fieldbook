/**
 * Minimal async SQL interface the repositories depend on. Two adapters implement it:
 * - native (iOS/Android): expo-sqlite (see client.ts)
 * - web and tests: sql.js, SQLite compiled to WebAssembly (see adapters/sqljs.ts)
 *
 * Transactions do not nest. Repositories open at most one transaction per operation.
 */
export type SqlValue = string | number | null;

export interface SqlDb {
  /** Runs one or more semicolon-separated statements with no parameters. */
  exec(sql: string): Promise<void>;
  /** Runs a single statement and reports how many rows it changed. */
  run(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** Runs `work` inside BEGIN/COMMIT. Rolls back and rethrows if `work` throws. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

/** Thrown when an operation refers to a row that does not exist. */
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/** Serialises async jobs so that only one transaction runs at a time on a single connection. */
export function createSerialQueue(): <T>(job: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}
