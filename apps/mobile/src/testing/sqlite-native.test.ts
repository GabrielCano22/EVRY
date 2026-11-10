import { mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { createSQLiteBridge } = jest.requireActual('./sqlite-native');
function directory() {
  const parent = resolve(__dirname, '../../../../.worktrees');
  mkdirSync(parent, { recursive: true });
  return mkdtempSync(resolve(parent, 'sqlite-bridge-'));
}

it('persists committed statements when a new bridge reopens the same file', async () => {
  const root = directory();
  const first = await createSQLiteBridge(root).openDatabaseAsync('account.db');
  await first.execAsync('CREATE TABLE source (value TEXT);');
  await first.withTransactionAsync(async () => { await first.runAsync('INSERT INTO source VALUES (?)', 'offline source'); });
  expect(readdirSync(root)).toContain('account.db');
  const reopened = await createSQLiteBridge(root).openDatabaseAsync('account.db');
  expect(await reopened.getAllAsync('SELECT value FROM source')).toEqual([{ value: 'offline source' }]);
});

it.each(['../outside.db', '..\\outside.db', '/absolute.db', 'C:\\absolute.db'])('rejects file path escape %s without opening a database', async name => {
  const root = directory();
  await expect(createSQLiteBridge(root).openDatabaseAsync(name)).rejects.toThrow(/database name/);
  expect(readdirSync(root)).toEqual([]);
});

it('keeps memory defaults independent and rolls back file transactions', async () => {
  const root = directory();
  const file = await createSQLiteBridge(root).openDatabaseAsync('rollback.db');
  await file.execAsync('CREATE TABLE source (value TEXT);');
  await expect(file.withTransactionAsync(async () => {
    await file.runAsync('INSERT INTO source VALUES (?)', 'must roll back');
    throw new Error('interrupted write');
  })).rejects.toThrow('interrupted write');
  expect(await file.getAllAsync('SELECT value FROM source')).toEqual([]);
  const memory = await createSQLiteBridge().openDatabaseAsync('rollback.db');
  expect(await memory.getFirstAsync("SELECT name FROM sqlite_master WHERE name='source'")).toBeNull();
});
