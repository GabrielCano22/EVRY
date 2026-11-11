import * as SQLite from 'expo-sqlite';
import { cachedExercisePage, getDatabase, loadActiveWorkout, pendingSyncRows } from './database';
import type { LocalWorkout } from '../training/workout-domain';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const workout: LocalWorkout = {
  clientId: 'workout-1', revision: 4, status: 'ACTIVE', name: 'Conservar sesión',
  startedAt: '2026-08-30T10:00:00Z', notes: 'Nota privada', deletedSetClientIds: [],
  sets: [{ clientId: 'set-1', exerciseId: 'exercise-0', order: 0, reps: 8, weightKg: 45, revision: 2,
    durationS: null, rpe: null, isWarmup: false, techniqueStable: null, completedAt: '2026-08-30T10:05:00Z' }],
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
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 5 });
  const page = await cachedExercisePage(owner, 'CUÁDRICEPS', 7);
  expect(page).toMatchObject({ total: 205, page: 7, limit: 30, hasMore: false, available: true });
  expect(page.items).toHaveLength(25);
  expect(page.items[24].name).toBe('Sentadilla 204');
  expect(await loadActiveWorkout(owner)).toEqual(workout);
  expect(JSON.parse((await pendingSyncRows(owner))[0].payload)).toEqual(syncPayload);
});

it('opens training data despite one malformed cached exercise and preserves its raw payload', async () => {
  const { owner, raw } = await seedV1('migration-damaged-cache', true);
  await getDatabase(owner);
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 5 });
  expect(await raw.getFirstAsync('SELECT payload FROM workouts')).toEqual({ payload: JSON.stringify(workout) });
  expect(await raw.getFirstAsync('SELECT payload, attempts FROM sync_queue')).toEqual({ payload: JSON.stringify(syncPayload), attempts: 2 });
  expect(await raw.getFirstAsync("SELECT payload FROM exercise_cache WHERE id = 'exercise-150'")).toEqual({ payload: '{invalid' });
  expect((await cachedExercisePage(owner, 'cuádriceps', 1)).total).toBe(204);
  expect(await loadActiveWorkout(owner)).toEqual(workout);
  expect((await pendingSyncRows(owner))[0]).toMatchObject({ syncId: 'sync-1', attempts: 2 });
});

it('expands populated v2 storage without rewriting catalog indexes, source data or pending sync', async () => {
  const { owner, raw } = await seedV1('rest-migration-v2');
  await raw.execAsync(`
    CREATE TABLE cache_metadata (table_name TEXT PRIMARY KEY NOT NULL, saved_at TEXT NOT NULL);
    CREATE TABLE exercise_search (exercise_id TEXT PRIMARY KEY NOT NULL, search_text TEXT NOT NULL,
      FOREIGN KEY(exercise_id) REFERENCES exercise_cache(id) ON DELETE CASCADE);
    INSERT INTO cache_metadata VALUES ('exercise_cache', '2026-10-07');
    INSERT INTO exercise_search VALUES ('exercise-001', 'preserve-index');
    PRAGMA user_version = 2;
  `);
  const tables = ['workouts', 'sync_queue', 'routine_cache', 'id_mapping', 'media_cache', 'exercise_cache', 'cache_metadata', 'exercise_search'];
  const before = await Promise.all(tables.map(table => raw.getAllAsync(`SELECT * FROM ${table}`)));
  await getDatabase(owner);
  expect(await raw.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 5 });
  expect(await raw.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'rest_timers' AND type = 'table'"))
    .toEqual({ name: 'rest_timers' });
  for (const table of ['rest_preferences', 'ui_preferences']) {
    expect(await raw.getFirstAsync('SELECT name FROM sqlite_master WHERE name = ? AND type = ?', table, 'table'))
      .toEqual({ name: table });
  }
  expect(await Promise.all(tables.map(table => raw.getAllAsync(`SELECT * FROM ${table}`)))).toEqual(before);
});
