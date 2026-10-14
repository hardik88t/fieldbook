import type { SqlDb } from '../sql';

/** Small per-device key/value store, for example the active customer. */
export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  /** Pass null to delete the key. */
  set(key: string, value: string | null): Promise<void>;
}

export function createSettingsRepository(db: SqlDb): SettingsRepository {
  return {
    async get(key) {
      const row = await db.first<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        [key],
      );
      return row?.value ?? null;
    },
    async set(key, value) {
      if (value === null) {
        await db.run('DELETE FROM app_settings WHERE key = ?', [key]);
        return;
      }
      await db.run(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [key, value],
      );
    },
  };
}
