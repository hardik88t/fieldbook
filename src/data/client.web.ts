/**
 * Web database client. expo-sqlite's web build needs SharedArrayBuffer and cross-origin isolation
 * headers, which GitHub Pages cannot send. So web runs sql.js (the same SQL, same schema) and keeps
 * the database file in IndexedDB. If IndexedDB is unavailable the app still runs, in memory only.
 */
import { openSqlJsDatabase } from './adapters/sqljs';
import type { SqlDb } from './sql';

const DB_NAME = 'fieldbook';
const STORE_NAME = 'files';
const FILE_KEY = 'fieldbook.sqlite';

function wasmUrl(): string {
  const base = process.env.EXPO_BASE_URL ?? '';
  return `${base}/sql-wasm-browser.wasm`;
}

let idbPromise: Promise<IDBDatabase> | null = null;

/** One shared connection for the page's lifetime. */
function openIdb(): Promise<IDBDatabase> {
  idbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      idbPromise = null;
      reject(request.error);
    };
  });
  return idbPromise;
}

async function loadBytes(): Promise<Uint8Array | null> {
  try {
    const idb = await openIdb();
    return await new Promise<Uint8Array | null>((resolve, reject) => {
      const request = idb.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(FILE_KEY);
      request.onsuccess = () => resolve((request.result as Uint8Array | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(bytes, FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function openAppDatabase(): Promise<SqlDb> {
  const persistable = typeof indexedDB !== 'undefined';
  const saved = persistable ? await loadBytes() : null;

  // Saves run one after another, so the last snapshot always wins on disk.
  let saveChain: Promise<void> = Promise.resolve();
  let handle: Awaited<ReturnType<typeof openSqlJsDatabase>> | null = null;

  /**
   * Called after each committed write. The write resolves only once the file is in IndexedDB, so a
   * reload or closing the tab right after a change keeps it. A failed save does not fail the write,
   * because the change is still in memory for this session.
   */
  const persist = (): Promise<void> => {
    if (!persistable || !handle) return Promise.resolve();
    const bytes = handle.exportBytes();
    saveChain = saveChain
      .then(() => saveBytes(bytes))
      .catch((error: unknown) => {
        console.warn('Fieldbook: could not persist database to IndexedDB', error);
      });
    return saveChain;
  };

  handle = await openSqlJsDatabase({
    wasmUrl: wasmUrl(),
    data: saved,
    onWrite: persist,
  });
  return handle.db;
}
