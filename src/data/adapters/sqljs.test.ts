import { openSqlJsDatabase } from './sqljs';

describe('sql.js adapter', () => {
  it('rolls back a transaction when its work throws', async () => {
    const { db } = await openSqlJsDatabase();
    await db.exec('CREATE TABLE t (v INTEGER)');
    await expect(
      db.transaction(async () => {
        await db.run('INSERT INTO t (v) VALUES (1)');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM t')).toEqual({ n: 0 });
  });

  it('serialises concurrent transactions so BEGIN never nests', async () => {
    const { db } = await openSqlJsDatabase();
    await db.exec('CREATE TABLE t (v INTEGER)');
    const slowWrite = (value: number) =>
      db.transaction(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        await db.run('INSERT INTO t (v) VALUES (?)', [value]);
        return value;
      });
    const results = await Promise.all([slowWrite(1), slowWrite(2), slowWrite(3)]);
    expect(results).toEqual([1, 2, 3]);
    expect(await db.all<{ v: number }>('SELECT v FROM t ORDER BY v')).toEqual([
      { v: 1 },
      { v: 2 },
      { v: 3 },
    ]);
  });

  it('returns null from first() when no row matches', async () => {
    const { db } = await openSqlJsDatabase();
    await db.exec('CREATE TABLE t (v INTEGER)');
    expect(await db.first('SELECT v FROM t WHERE v = ?', [42])).toBeNull();
  });

  it('exports and restores a database file', async () => {
    const first = await openSqlJsDatabase();
    await first.db.exec('CREATE TABLE t (v TEXT)');
    await first.db.run('INSERT INTO t (v) VALUES (?)', ['kept']);
    const bytes = first.exportBytes();

    const restored = await openSqlJsDatabase({ data: bytes });
    expect(await restored.db.first<{ v: string }>('SELECT v FROM t')).toEqual({ v: 'kept' });
  });
});
