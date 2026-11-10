import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { getDatabase } from './database';

// Keep real file-backed SQLite; replace only Expo's native bridge.
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = jest.requireActual('node:sqlite');
  const { resolve } = jest.requireActual('node:path');
  return {
    openDatabaseAsync: async (name: string) => {
      const native = new DatabaseSync(resolve(mockDirectory, name));
      mockConnections.push(native);
      return {
        execAsync: async (sql: string) => native.exec(sql),
        getFirstAsync: async (sql: string, ...params: unknown[]) => native.prepare(sql).get(...params) ?? null,
        getAllAsync: async (sql: string, ...params: unknown[]) => native.prepare(sql).all(...params),
        runAsync: async (sql: string, ...params: unknown[]) => native.prepare(sql).run(...params),
        closeAsync: async () => native.close(),
        withTransactionAsync: async (operation: () => Promise<void>) => {
          native.exec('BEGIN');
          try { await operation(); native.exec('COMMIT'); }
          catch (error) { native.exec('ROLLBACK'); throw error; }
        },
      };
    },
  };
});
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const { DatabaseSync } = jest.requireActual('node:sqlite');
const mockConnections: InstanceType<typeof DatabaseSync>[] = [];
let mockDirectory: string;

beforeEach(() => {
  const parent = resolve(__dirname, '../../../../.worktrees');
  mkdirSync(parent, { recursive: true });
  mockDirectory = mkdtempSync(resolve(parent, 'sqlite-open-failure-'));
});
afterEach(() => {
  // Retain synthetic files for inspection; release every actual native handle.
  for (const connection of mockConnections.splice(0)) if (connection.isOpen) connection.close();
});

it.each(['migration', 'queue-recovery'] as const)(
  'releases a failed %s connection before retrying and preserves its source rows', async (phase) => {
    const owner = { userId: `open-failure-${phase}`, serverUrl: 'https://api.example.invalid/api/v1' };
    const digest = createHash('sha256').update(JSON.stringify([owner.serverUrl, owner.userId])).digest('hex');
    const filename = resolve(mockDirectory, `evry-account-${digest}.db`);
    const source = new DatabaseSync(filename);
    try {
      source.exec(`
        CREATE TABLE workouts (client_id TEXT PRIMARY KEY, payload TEXT, sync_state TEXT, status TEXT);
        INSERT INTO workouts VALUES ('offline-workout', '{"notes":"preserved source"}', 'pending', 'ACTIVE');
        ${phase === 'migration' ? 'CREATE TABLE exercise_cache (id TEXT PRIMARY KEY); PRAGMA user_version = 1;' : 'PRAGMA user_version = 3;'}
      `);
      await expect(getDatabase(owner)).rejects.toThrow(
        phase === 'migration' ? /no such column: payload/ : /no such table: sync_queue/,
      );
      expect(mockConnections).toHaveLength(1);
      // Removing closeAsync from production must fail this actual handle check.
      expect(mockConnections[0].isOpen).toBe(false);
      expect(source.prepare('SELECT * FROM workouts').all()).toEqual([
        { client_id: 'offline-workout', payload: '{"notes":"preserved source"}', sync_state: 'pending', status: 'ACTIVE' },
      ]);

      // Repair only this independently created synthetic fixture; no reset/deletion.
      source.exec(`
        CREATE TABLE IF NOT EXISTS sync_queue (state TEXT);
        ${phase === 'migration' ? 'ALTER TABLE exercise_cache ADD COLUMN payload TEXT;' : ''}
      `);
      const retry = getDatabase(owner);
      expect(getDatabase(owner)).toBe(retry);
      const reopened = await retry;
      expect(await reopened.getFirstAsync('SELECT * FROM workouts')).toEqual({
        client_id: 'offline-workout', payload: '{"notes":"preserved source"}', sync_state: 'pending', status: 'ACTIVE',
      });
      expect(mockConnections[1].isOpen).toBe(true);
      expect(await getDatabase(owner)).toBe(reopened);
    } finally { source.close(); }
  },
);
