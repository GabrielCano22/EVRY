import * as SQLite from 'expo-sqlite';
import { cachedExercisePage, getDatabase, loadActiveWorkout, pendingSyncRows } from './database';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const workout = {
  clientId: 'workout-1', revision: 4, status: 'ACTIVE', name: 'Conservar sesión',
  startedAt: '2026-08-30T10:00:00Z', notes: 'Nota privada', deletedSetClientIds: [],
  sets: [{ clientId: 'set-1', exerciseId: 'exercise-0', order: 0, reps: 8, weightKg: 45, revision: 2 }],
};
const syncPayload = { clientId: 'workout-1', syncId: 'sync-1', baseRevision: 4, status: 'ACTIVE', name: workout.name, sets: workout.sets };

// A populated v1 schema, created independently from the production migration.
async function seedV1(userId: string, malformed = false) {
  const owner = { userId, serverUrl: 'https://api.example.com/api/v1' };
  const digest = jest.requireActual('node:crypto').createHash('sha256').update(JSON.stringify([owner.serverUrl, owner.userId])).digest('hex');
  const raw = await SQLite.openDatabaseAsync(`evry-account-${digest}.db`);
  await raw.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE exercise_cache (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, last_access_at TEXT NOT NULL);
    CREATE TABLE routine_cache (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE workouts (client_id TEXT PRIMARY KEY NOT NULL, server_id TEXT, revision INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, sync_state TEXT NOT NULL DEFAULT 'synced', payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE UNIQUE INDEX workouts_one_active ON workouts(status) WHERE status = 'ACTIVE';
    CREATE TABLE sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, sync_id TEXT NOT NULL UNIQUE, workout_client_id TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(workout_client_id) REFERENCES workouts(client_id) ON DELETE CASCADE);
    CREATE INDEX sync_queue_state_created ON sync_queue(state, created_at);
    CREATE TABLE id_mapping (entity_type TEXT NOT NULL, client_id TEXT NOT NULL, server_id TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(entity_type, client_id));
    CREATE TABLE media_cache (url TEXT PRIMARY KEY NOT NULL, local_uri TEXT NOT NULL, bytes INTEGER NOT NULL DEFAULT 0, last_access_at TEXT NOT NULL);
    PRAGMA user_version = 1;
  `);
  for (let i = 0; i < 205; i++) {
    await raw.runAsync('INSERT INTO exercise_cache VALUES (?, ?, ?, ?)', `exercise-${String(i).padStart(3, '0')}`,
      malformed && i === 150 ? '{invalid' : JSON.stringify({ id: `exercise-${i}`, name: `Sentadilla ${String(i).padStart(3, '0')}`, target: 'Cuádriceps' }), '2026-08-29', '2026-08-29');
  }
  await raw.runAsync('INSERT INTO routine_cache VALUES (?, ?, ?)', 'routine-1', '{"id":"routine-1","name":"Piernas","exercises":[]}', '2026-08-29');
  await raw.runAsync('INSERT INTO workouts VALUES (?, ?, ?, ?, ?, ?, ?)', 'workout-1', 'server-1', 4, 'ACTIVE', 'pending', JSON.stringify(workout), '2026-08-29');
  await raw.runAsync('INSERT INTO sync_queue (sync_id, workout_client_id, payload, attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 'sync-1', 'workout-1', JSON.stringify(syncPayload), 2, '2026-08-29', '2026-08-29');
  await raw.runAsync('INSERT INTO id_mapping VALUES (?, ?, ?, ?)', 'workout', 'workout-1', 'server-1', '2026-08-29');
  await raw.runAsync('INSERT INTO media_cache VALUES (?, ?, ?, ?)', 'https://cdn.example/1.jpg', 'local/1.jpg', 1200, '2026-08-29');
  return { owner, raw };
}

it('indexes every batch from v1 without changing workouts, queue, routines, mappings or media', async () => {
  const { owner, raw } = await seedV1('migration-preserve');
  const before = await Promise.all(['workouts', 'sync_queue', 'routine_cache', 'id_mapping', 'media_cache', 'exercise_cache'].map((table) => raw.getAllAsync(`SELECT * FROM ${table}`)));
  await getDatabase(owner);
  const after = await Promise.all(['workouts', 'sync_queue', 'routine_cache', 'id_mapping', 'media_cache', 'exercise_cache'].map((table) => raw.getAllAsync(`SELECT * FROM ${table}`)));
  expect(after).toEqual(before);
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
  const page = await cachedExercisePage(owner, 'CUÁDRICEPS', 7);
  expect(page).toMatchObject({ total: 205, page: 7, limit: 30, hasMore: false, available: true });
  expect(page.items).toHaveLength(25);
  expect(page.items[24].name).toBe('Sentadilla 204');
  expect(await loadActiveWorkout(owner)).toEqual(workout);
  expect(JSON.parse((await pendingSyncRows(owner))[0].payload)).toEqual(syncPayload);
});

it('rolls back an interrupted index backfill and safely retries without losing queued training', async () => {
  const { owner, raw } = await seedV1('migration-retry', true);
  await expect(getDatabase(owner)).rejects.toThrow();
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 1 });
  expect(await raw.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'exercise_search'")).toBeNull();
  expect(await raw.getFirstAsync('SELECT payload FROM workouts')).toEqual({ payload: JSON.stringify(workout) });
  expect(await raw.getFirstAsync('SELECT payload, attempts FROM sync_queue')).toEqual({ payload: JSON.stringify(syncPayload), attempts: 2 });
  // Simulate repairing the one invalid cache record; no user training data is rewritten.
  await raw.runAsync('UPDATE exercise_cache SET payload = ? WHERE id = ?', '{"id":"exercise-150","name":"Sentadilla 150","target":"Cuádriceps"}', 'exercise-150');
  await getDatabase(owner);
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
  expect((await cachedExercisePage(owner, 'cuádriceps', 1)).total).toBe(205);
  expect(await loadActiveWorkout(owner)).toEqual(workout);
  expect((await pendingSyncRows(owner))[0]).toMatchObject({ syncId: 'sync-1', attempts: 2 });
});
