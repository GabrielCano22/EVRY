import * as SQLite from 'expo-sqlite';
import type { LocalWorkout } from '../training/workout-domain';
import { aggregateSyncState, type SyncQueueState } from '../sync/queue-policy';

const DATABASE_NAME = 'evry.db';
const DATABASE_VERSION = 1;

export interface PendingSyncRow {
  id: number;
  syncId: string;
  workoutClientId: string;
  payload: string;
  attempts: number;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
    await migrate(database);
    return database;
  });
  return databasePromise;
}

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const version = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) >= DATABASE_VERSION) return;

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_cache (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_access_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_cache (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workouts (
      client_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT,
      revision INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS workouts_one_active
      ON workouts(status) WHERE status = 'ACTIVE';
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT NOT NULL UNIQUE,
      workout_client_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(workout_client_id) REFERENCES workouts(client_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS sync_queue_state_created
      ON sync_queue(state, created_at);
    CREATE TABLE IF NOT EXISTS id_mapping (
      entity_type TEXT NOT NULL,
      client_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(entity_type, client_id)
    );
    CREATE TABLE IF NOT EXISTS media_cache (
      url TEXT PRIMARY KEY NOT NULL,
      local_uri TEXT NOT NULL,
      bytes INTEGER NOT NULL DEFAULT 0,
      last_access_at TEXT NOT NULL
    );
    PRAGMA user_version = ${DATABASE_VERSION};
  `);
}

export async function saveWorkout(
  workout: LocalWorkout,
  syncState: SyncQueueState = 'synced',
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO workouts (client_id, revision, status, sync_state, payload, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET
       revision = excluded.revision,
       status = excluded.status,
       sync_state = excluded.sync_state,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    workout.clientId,
    workout.revision,
    workout.status,
    syncState,
    JSON.stringify(workout),
    new Date().toISOString(),
  );
}

export async function loadActiveWorkout(): Promise<LocalWorkout | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM workouts WHERE status = 'ACTIVE' LIMIT 1",
  );
  return row ? JSON.parse(row.payload) as LocalWorkout : null;
}

export async function enqueueWorkout(
  workout: LocalWorkout,
  syncId: string,
  payload: unknown,
): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await saveWorkout(workout, 'pending');
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO sync_queue
        (sync_id, workout_client_id, payload, state, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?)
       ON CONFLICT(sync_id) DO NOTHING`,
      syncId,
      workout.clientId,
      JSON.stringify(payload),
      now,
      now,
    );
  });
}

export async function pendingSyncRows(): Promise<PendingSyncRow[]> {
  const database = await getDatabase();
  return database.getAllAsync<PendingSyncRow>(
    `SELECT id, sync_id AS syncId, workout_client_id AS workoutClientId,
      payload, attempts FROM sync_queue
     WHERE state = 'pending' ORDER BY created_at ASC LIMIT 20`,
  );
}

export async function currentSyncState(): Promise<SyncQueueState> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ syncState: SyncQueueState }>(
    `SELECT DISTINCT sync_state AS syncState FROM workouts
     WHERE sync_state <> 'synced'`,
  );
  return aggregateSyncState(rows.map((row) => row.syncState));
}

export async function markSyncAttempt(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE sync_queue SET state = 'syncing', attempts = attempts + 1, updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

export async function markSyncFailure(
  id: number,
  workoutClientId: string,
  state: Extract<SyncQueueState, 'pending' | 'requires_review'>,
  errorCode: string,
): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'UPDATE sync_queue SET state = ?, last_error = ?, updated_at = ? WHERE id = ?',
      state,
      errorCode,
      new Date().toISOString(),
      id,
    );
    await database.runAsync(
      'UPDATE workouts SET sync_state = ?, updated_at = ? WHERE client_id = ?',
      state,
      new Date().toISOString(),
      workoutClientId,
    );
  });
}

export async function markSyncSuccess(
  row: PendingSyncRow,
  result: {
    revision: number;
    mapping: {
      workout: { serverId: string };
      sets?: { clientId: string; serverId: string }[];
    };
  },
): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const now = new Date().toISOString();
    await database.runAsync('DELETE FROM sync_queue WHERE id = ?', row.id);
    await database.runAsync(
      `UPDATE workouts SET server_id = ?, revision = ?, sync_state = 'synced', updated_at = ?
       WHERE client_id = ?`,
      result.mapping.workout.serverId,
      result.revision,
      now,
      row.workoutClientId,
    );
    await database.runAsync(
      `INSERT INTO id_mapping (entity_type, client_id, server_id, updated_at)
       VALUES ('workout', ?, ?, ?)
       ON CONFLICT(entity_type, client_id) DO UPDATE SET
         server_id = excluded.server_id, updated_at = excluded.updated_at`,
      row.workoutClientId,
      result.mapping.workout.serverId,
      now,
    );
    for (const set of result.mapping.sets ?? []) {
      await database.runAsync(
        `INSERT INTO id_mapping (entity_type, client_id, server_id, updated_at)
         VALUES ('set', ?, ?, ?)
         ON CONFLICT(entity_type, client_id) DO UPDATE SET
           server_id = excluded.server_id, updated_at = excluded.updated_at`,
        set.clientId,
        set.serverId,
        now,
      );
    }
  });
}

export async function cacheEntities(
  table: 'exercise_cache' | 'routine_cache',
  entities: { id: string }[],
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    for (const entity of entities) {
      if (table === 'exercise_cache') {
        await database.runAsync(
          `INSERT INTO exercise_cache (id, payload, updated_at, last_access_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET payload = excluded.payload,
             updated_at = excluded.updated_at, last_access_at = excluded.last_access_at`,
          entity.id,
          JSON.stringify(entity),
          now,
          now,
        );
      } else {
        await database.runAsync(
          `INSERT INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
          entity.id,
          JSON.stringify(entity),
          now,
        );
      }
    }
  });
}

export async function cachedEntities<T>(
  table: 'exercise_cache' | 'routine_cache',
): Promise<T[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ payload: string }>(
    `SELECT payload FROM ${table} ORDER BY updated_at DESC`,
  );
  return rows.map(({ payload }) => JSON.parse(payload) as T);
}
