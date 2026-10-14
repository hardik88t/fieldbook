import { createRepositories, type Repositories } from '@/data/repositories';
import type { SqlDb } from '@/data/sql';
import { SyncEngine } from '@/sync/engine';
import type { SyncTransport } from '@/sync/types';

import { ChangeBus } from './bus';

export interface AppServices {
  db: SqlDb;
  repos: Repositories;
  transport: SyncTransport;
  engine: SyncEngine;
  bus: ChangeBus;
  /** Clock used for timestamps and "today". Injected for tests. */
  now: () => Date;
}

export function createServices(options: {
  db: SqlDb;
  transport: SyncTransport;
  now?: () => Date;
}): AppServices {
  const bus = new ChangeBus();
  const now = options.now ?? (() => new Date());
  const repos = createRepositories(options.db);
  const engine = new SyncEngine({
    repos,
    transport: options.transport,
    now: () => now().getTime(),
    notify: bus.notify,
  });
  return { db: options.db, repos, transport: options.transport, engine, bus, now };
}
