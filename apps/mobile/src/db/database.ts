import * as SQLite from 'expo-sqlite';
import type { components } from '@evry/api-client';
import type { LocalWorkout } from '../training/workout-domain';
import { aggregateSyncState, type SyncQueueState } from '../sync/queue-policy';
import { canonicalWorkoutFromServer } from '../sync/conflict-resolution';
import { rebaseSyncPayload, rebaseWorkoutRevisions } from '../sync/revisions';
import type { SyncWorkoutInput } from '../api/client';

const DATABASE_NAME = 'evry.db';
const DATABASE_VERSION = 1;

export interface PendingSyncRow {
  id: number;
  syncId: string;
  workoutClientId: string;
  payload: string;
  attempts: number;
}

export interface SyncReview {
  workoutClientId: string;
  workoutName: string;
  errorCode: string;
  serverVersion: components['schemas']['Workout'] | null;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

// Expo's async transactions share a connection. Serialize complete write units so
// a network acknowledgement cannot commit/rollback an unrelated local edit.
function writeTransaction<T>(database: SQLite.SQLiteDatabase, operation: () => Promise<T>): Promise<T> {
  const write = writeQueue.then(async () => {
    let result!: T;
    await database.withTransactionAsync(async () => { result = await operation(); });
    return result;
  });
  writeQueue = write.then(() => undefined, () => undefined);
  return write;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
    await migrate(database);
    await database.execAsync(`
      UPDATE sync_queue SET state = 'pending' WHERE state = 'syncing';
      UPDATE workouts SET sync_state = 'pending' WHERE sync_state = 'syncing';
    `);
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
  await writeTransaction(database, () => persistWorkout(database, workout, syncState));
}

async function persistWorkout(
  database: SQLite.SQLiteDatabase,
  workout: LocalWorkout,
  syncState: SyncQueueState,
): Promise<void> {
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

export async function loadRecoveredDrafts(): Promise<LocalWorkout[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ payload: string }>(
    "SELECT payload FROM workouts WHERE status = 'DRAFT' ORDER BY updated_at DESC LIMIT 20",
  );
  return rows.map((row) => JSON.parse(row.payload) as LocalWorkout);
}

export async function archiveRecoveredDraft(draft: LocalWorkout): Promise<void> {
  await saveWorkout({ ...draft, status: 'CANCELLED', cancelledAt: new Date().toISOString() }, 'synced');
}

export async function enqueueWorkout(
  workout: LocalWorkout,
  syncId: string,
  payload: SyncWorkoutInput,
): Promise<SyncQueueState> {
  const database = await getDatabase();
  let syncState: SyncQueueState = 'pending';
  await writeTransaction(database, async () => {
    const stored = await database.getFirstAsync<{ revision: number; payload: string }>(
      'SELECT revision, payload FROM workouts WHERE client_id = ?',
      workout.clientId,
    );
    const canonicalSets = stored ? (JSON.parse(stored.payload) as LocalWorkout).sets : [];
    const revision = Math.max(workout.revision, stored?.revision ?? 0);
    const rebasedWorkout = rebaseWorkoutRevisions(workout, revision, canonicalSets);
    const rebasedPayload = rebaseSyncPayload(payload, revision, canonicalSets);
    const review = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM sync_queue WHERE workout_client_id = ? AND state = 'requires_review' LIMIT 1",
      workout.clientId,
    );
    if (review) {
      syncState = 'requires_review';
      await persistWorkout(database, rebasedWorkout, syncState);
      return;
    }
    await persistWorkout(database, rebasedWorkout, syncState);
    await database.runAsync(
      "DELETE FROM sync_queue WHERE workout_client_id = ? AND state = 'pending' AND attempts = 0",
      workout.clientId,
    );
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO sync_queue
        (sync_id, workout_client_id, payload, state, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?)
       ON CONFLICT(sync_id) DO NOTHING`,
      syncId,
      workout.clientId,
      JSON.stringify(rebasedPayload),
      now,
      now,
    );
  });
  return syncState;
}

export async function pendingSyncRows(): Promise<PendingSyncRow[]> {
  const database = await getDatabase();
  return database.getAllAsync<PendingSyncRow>(
    `SELECT q.id, q.sync_id AS syncId, q.workout_client_id AS workoutClientId,
      q.payload, q.attempts FROM sync_queue q
     WHERE q.state = 'pending' AND NOT EXISTS (
       SELECT 1 FROM sync_queue earlier
       WHERE earlier.workout_client_id = q.workout_client_id
         AND earlier.id < q.id AND earlier.state IN ('pending', 'syncing', 'requires_review')
     ) ORDER BY q.id ASC LIMIT 20`,
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

export async function markSyncAttempt(id: number): Promise<boolean> {
  const database = await getDatabase();
  return writeTransaction(database, async () => {
    const result = await database.runAsync(
      "UPDATE sync_queue SET state = 'syncing', attempts = attempts + 1, updated_at = ? WHERE id = ? AND state = 'pending'",
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) return false;
    await database.runAsync(
      `UPDATE workouts SET sync_state = 'syncing'
       WHERE client_id = (SELECT workout_client_id FROM sync_queue WHERE id = ?)`,
      id,
    );
    return true;
  });
}

export async function markSyncFailure(
  id: number,
  workoutClientId: string,
  state: Extract<SyncQueueState, 'pending' | 'requires_review'>,
  errorCode: string,
  serverVersion?: components['schemas']['Workout'] | null,
): Promise<void> {
  const database = await getDatabase();
  await writeTransaction(database, async () => {
    if (state === 'requires_review') {
      await database.runAsync(
        "DELETE FROM sync_queue WHERE workout_client_id = ? AND state = 'pending' AND id <> ?",
        workoutClientId,
        id,
      );
    }
    await database.runAsync(
      'UPDATE sync_queue SET state = ?, last_error = ?, updated_at = ? WHERE id = ?',
      state,
      JSON.stringify({ code: errorCode, serverVersion: serverVersion ?? null }),
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

export async function syncReviews(): Promise<SyncReview[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    workoutClientId: string;
    payload: string;
    lastError: string | null;
  }>(
    `SELECT q.workout_client_id AS workoutClientId, w.payload, q.last_error AS lastError
     FROM sync_queue q JOIN workouts w ON w.client_id = q.workout_client_id
     WHERE q.state = 'requires_review' ORDER BY q.updated_at DESC`,
  );
  return rows.map((row) => {
    const workout = JSON.parse(row.payload) as LocalWorkout;
    let error: { code?: string; serverVersion?: components['schemas']['Workout'] | null } = {};
    try { error = JSON.parse(row.lastError ?? '{}') as typeof error; } catch { error = { code: row.lastError ?? undefined }; }
    return {
      workoutClientId: row.workoutClientId,
      workoutName: workout.name,
      errorCode: error.code ?? 'CONFLICT',
      serverVersion: error.serverVersion ?? null,
    };
  });
}

export async function keepReviewAsDraft(workoutClientId: string): Promise<void> {
  const database = await getDatabase();
  await writeTransaction(database, async () => {
    const row = await database.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM workouts WHERE client_id = ?',
      workoutClientId,
    );
    if (!row) return;
    const workout = JSON.parse(row.payload) as LocalWorkout;
    const draft: LocalWorkout = {
      ...workout,
      name: workout.name.endsWith('(recuperado)') ? workout.name : `${workout.name} (recuperado)`,
      status: 'DRAFT',
    };
    await database.runAsync('DELETE FROM sync_queue WHERE workout_client_id = ?', workoutClientId);
    await database.runAsync(
      `UPDATE workouts SET status = 'DRAFT', sync_state = 'synced', payload = ?, updated_at = ?
       WHERE client_id = ?`,
      JSON.stringify(draft),
      new Date().toISOString(),
      workoutClientId,
    );
  });
}

export async function continueServerWorkout(review: SyncReview): Promise<void> {
  if (!review.serverVersion) throw new Error('El servidor no devolvió una sesión recuperable.');
  const database = await getDatabase();
  const server = review.serverVersion;
  const canonical = canonicalWorkoutFromServer(review.workoutClientId, server);
  await writeTransaction(database, async () => {
    if (canonical.status === 'ACTIVE') {
      const otherActive = await database.getFirstAsync<{ clientId: string }>(
        "SELECT client_id AS clientId FROM workouts WHERE status = 'ACTIVE' AND client_id <> ? LIMIT 1",
        review.workoutClientId,
      );
      if (otherActive) throw new Error('Finaliza la sesión local activa antes de continuar la del servidor.');
    }
    await database.runAsync('DELETE FROM sync_queue WHERE workout_client_id = ?', review.workoutClientId);
    await database.runAsync('DELETE FROM workouts WHERE client_id = ?', review.workoutClientId);
    await database.runAsync(
      `INSERT INTO workouts (client_id, server_id, revision, status, sync_state, payload, updated_at)
       VALUES (?, ?, ?, ?, 'synced', ?, ?)`,
      canonical.clientId,
      server.id,
      canonical.revision,
      canonical.status,
      JSON.stringify(canonical),
      new Date().toISOString(),
    );
  });
}

export async function markSyncSuccess(
  row: PendingSyncRow,
  result: {
    revision: number;
    mapping: {
      workout: { serverId: string };
      sets?: { clientId: string; serverId: string; revision: number }[];
    };
  },
): Promise<void> {
  const database = await getDatabase();
  await writeTransaction(database, async () => {
    const now = new Date().toISOString();
    await database.runAsync('DELETE FROM sync_queue WHERE id = ?', row.id);
    const stored = await database.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM workouts WHERE client_id = ?',
      row.workoutClientId,
    );
    const rebased = stored
      ? rebaseWorkoutRevisions(JSON.parse(stored.payload) as LocalWorkout, result.revision, result.mapping.sets ?? [])
      : null;
    const newerRows = await database.getAllAsync<{ id: number; payload: string }>(
      "SELECT id, payload FROM sync_queue WHERE workout_client_id = ? AND state = 'pending'",
      row.workoutClientId,
    );
    for (const newer of newerRows) {
      const payload = rebaseSyncPayload(
        JSON.parse(newer.payload) as SyncWorkoutInput,
        result.revision,
        result.mapping.sets ?? [],
      );
      await database.runAsync('UPDATE sync_queue SET payload = ?, updated_at = ? WHERE id = ?', JSON.stringify(payload), now, newer.id);
    }
    await database.runAsync(
      `UPDATE workouts SET server_id = ?, revision = ?, sync_state = ?, payload = COALESCE(?, payload), updated_at = ?
       WHERE client_id = ?`,
      result.mapping.workout.serverId,
      result.revision,
      newerRows.length > 0 ? 'pending' : 'synced',
      rebased ? JSON.stringify(rebased) : null,
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
  await writeTransaction(database, async () => {
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
