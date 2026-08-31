import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { components } from '@evry/api-client';
import type { LocalWorkout } from '../training/workout-domain';
import { aggregateSyncState, type SyncQueueState } from '../sync/queue-policy';
import { canonicalWorkoutFromServer } from '../sync/conflict-resolution';
import { rebaseSyncPayload, rebaseWorkoutRevisions } from '../sync/revisions';
import type { SyncWorkoutInput } from '../api/client';

export interface DatabaseOwner {
  readonly userId: string;
  readonly serverUrl: string;
}
const DATABASE_VERSION = 2;

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

const connections = new Map<string, Promise<SQLite.SQLiteDatabase>>();
const writeQueues = new WeakMap<SQLite.SQLiteDatabase, Promise<void>>();

// Expo's async transactions share a connection. Serialize complete write units so
// a network acknowledgement cannot commit/rollback an unrelated local edit.
// Separate account connections must not wait for each other's pending writes.
function writeTransaction<T>(database: SQLite.SQLiteDatabase, operation: () => Promise<T>): Promise<T> {
  const write = (writeQueues.get(database) ?? Promise.resolve()).then(async () => {
    let result!: T;
    await database.withTransactionAsync(async () => { result = await operation(); });
    return result;
  });
  writeQueues.set(database, write.then(() => undefined, () => undefined));
  return write;
}

export function getDatabase(owner: DatabaseOwner): Promise<SQLite.SQLiteDatabase> {
  if (!owner?.userId?.trim() || !owner.serverUrl?.trim()) {
    return Promise.reject(new Error('Se requiere una cuenta para abrir el almacenamiento local.'));
  }
  const key = JSON.stringify([owner.serverUrl.replace(/\/+$/, ''), owner.userId]);
  const existing = connections.get(key);
  if (existing) return existing;
  // Legacy evry.db has no trustworthy owner. Preserve it without assigning it
  // automatically; recovery requires an explicit ownership check.
  const connection = Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key)
    .then((digest) => SQLite.openDatabaseAsync(`evry-account-${digest}.db`))
    .then(async (database) => {
      await migrate(database);
      await database.execAsync(`
        UPDATE sync_queue SET state = 'pending' WHERE state = 'syncing';
        UPDATE workouts SET sync_state = 'pending' WHERE sync_state = 'syncing';
      `);
      return database;
    }).catch((error: unknown) => {
      connections.delete(key);
      throw error;
    });
  connections.set(key, connection);
  return connection;
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
    PRAGMA user_version = 1;
  `);
  await writeTransaction(database, async () => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_metadata (table_name TEXT PRIMARY KEY NOT NULL, saved_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS exercise_search (
        exercise_id TEXT PRIMARY KEY NOT NULL,
        search_text TEXT NOT NULL,
        FOREIGN KEY(exercise_id) REFERENCES exercise_cache(id) ON DELETE CASCADE
      );
    `);
    let cursor = '';
    for (;;) {
      const rows = await database.getAllAsync<{ id: string; payload: string }>(
        'SELECT id, payload FROM exercise_cache WHERE id > ? ORDER BY id LIMIT 100', cursor,
      );
      if (rows.length === 0) break;
      for (const row of rows) {
        await indexExercise(database, row.id, JSON.parse(row.payload) as object);
      }
      cursor = rows[rows.length - 1].id;
    }
    await database.execAsync('PRAGMA user_version = 2;');
  });
}

export async function saveWorkout(
  owner: DatabaseOwner,
  workout: LocalWorkout,
  syncState: SyncQueueState = 'synced',
): Promise<void> {
  const database = await getDatabase(owner);
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

export async function loadActiveWorkout(owner: DatabaseOwner): Promise<LocalWorkout | null> {
  const database = await getDatabase(owner);
  const row = await database.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM workouts WHERE status = 'ACTIVE' LIMIT 1",
  );
  return row ? JSON.parse(row.payload) as LocalWorkout : null;
}

export async function loadRecoveredDrafts(owner: DatabaseOwner): Promise<LocalWorkout[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<{ payload: string }>(
    "SELECT payload FROM workouts WHERE status = 'DRAFT' ORDER BY updated_at DESC LIMIT 20",
  );
  return rows.map((row) => JSON.parse(row.payload) as LocalWorkout);
}

export async function archiveRecoveredDraft(owner: DatabaseOwner, draft: LocalWorkout): Promise<void> {
  await saveWorkout(owner, { ...draft, status: 'CANCELLED', cancelledAt: new Date().toISOString() }, 'synced');
}

export async function enqueueWorkout(
  owner: DatabaseOwner,
  workout: LocalWorkout,
  syncId: string,
  payload: SyncWorkoutInput,
): Promise<SyncQueueState> {
  const database = await getDatabase(owner);
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

export async function pendingSyncRows(owner: DatabaseOwner): Promise<PendingSyncRow[]> {
  const database = await getDatabase(owner);
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

export async function currentSyncState(owner: DatabaseOwner): Promise<SyncQueueState> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<{ syncState: SyncQueueState }>(
    `SELECT DISTINCT sync_state AS syncState FROM workouts
     WHERE sync_state <> 'synced'`,
  );
  return aggregateSyncState(rows.map((row) => row.syncState));
}

export async function markSyncAttempt(owner: DatabaseOwner, id: number): Promise<boolean> {
  const database = await getDatabase(owner);
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
  owner: DatabaseOwner,
  id: number,
  workoutClientId: string,
  state: Extract<SyncQueueState, 'pending' | 'requires_review'>,
  errorCode: string,
  serverVersion?: components['schemas']['Workout'] | null,
): Promise<void> {
  const database = await getDatabase(owner);
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

export async function syncReviews(owner: DatabaseOwner): Promise<SyncReview[]> {
  const database = await getDatabase(owner);
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

export async function keepReviewAsDraft(owner: DatabaseOwner, workoutClientId: string): Promise<void> {
  const database = await getDatabase(owner);
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

export async function continueServerWorkout(owner: DatabaseOwner, review: SyncReview): Promise<void> {
  if (!review.serverVersion) throw new Error('El servidor no devolvió una sesión recuperable.');
  const database = await getDatabase(owner);
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
  owner: DatabaseOwner,
  row: PendingSyncRow,
  result: {
    revision: number;
    mapping: {
      workout: { serverId: string };
      sets?: { clientId: string; serverId: string; revision: number }[];
    };
  },
): Promise<void> {
  const database = await getDatabase(owner);
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

type CacheTable = 'exercise_cache' | 'routine_cache';

async function indexExercise(database: SQLite.SQLiteDatabase, id: string, entity: object): Promise<void> {
  const fields = entity as Record<string, unknown>;
  const searchable = ['name', 'target', 'bodyPart', 'equipmentLabel']
    .map((key) => typeof fields[key] === 'string' ? fields[key] : '')
    .join('\n').normalize('NFC').toLocaleLowerCase('es');
  await database.runAsync(
    'INSERT INTO exercise_search (exercise_id, search_text) VALUES (?, ?) ON CONFLICT(exercise_id) DO UPDATE SET search_text = excluded.search_text',
    id, searchable,
  );
}

async function storeCachedEntity(database: SQLite.SQLiteDatabase, table: CacheTable, entity: { id: string }, now: string): Promise<void> {
  if (table === 'exercise_cache') {
    await database.runAsync(
      `INSERT INTO exercise_cache (id, payload, updated_at, last_access_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, last_access_at = excluded.last_access_at`,
      entity.id, JSON.stringify(entity), now, now,
    );
    await indexExercise(database, entity.id, entity);
  } else {
    await database.runAsync(
      `INSERT INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      entity.id, JSON.stringify(entity), now,
    );
  }
}

async function markCacheSnapshot(database: SQLite.SQLiteDatabase, table: CacheTable, now: string): Promise<void> {
  await database.runAsync(
    'INSERT INTO cache_metadata (table_name, saved_at) VALUES (?, ?) ON CONFLICT(table_name) DO UPDATE SET saved_at = excluded.saved_at',
    table, now,
  );
}

export async function cacheEntities(owner: DatabaseOwner, table: CacheTable, entities: { id: string }[]): Promise<void> {
  const database = await getDatabase(owner);
  const now = new Date().toISOString();
  await writeTransaction(database, async () => {
    for (const entity of entities) await storeCachedEntity(database, table, entity, now);
    await markCacheSnapshot(database, table, now);
  });
}

/** A routines GET is a full snapshot, including the authoritative empty list. */
export async function replaceCachedRoutines(owner: DatabaseOwner, entities: { id: string }[]): Promise<void> {
  const database = await getDatabase(owner);
  const now = new Date().toISOString();
  await writeTransaction(database, async () => {
    await database.runAsync('DELETE FROM routine_cache');
    for (const entity of entities) await storeCachedEntity(database, 'routine_cache', entity, now);
    await markCacheSnapshot(database, 'routine_cache', now);
  });
}

async function cacheAvailability(database: SQLite.SQLiteDatabase, table: CacheTable) {
  const snapshot = await database.getFirstAsync<{ savedAt: string }>(
    'SELECT saved_at AS savedAt FROM cache_metadata WHERE table_name = ?', table,
  );
  const saved = await database.getFirstAsync<{ savedAt: string | null }>(`SELECT MAX(updated_at) AS savedAt FROM ${table}`);
  return { available: Boolean(snapshot || saved?.savedAt), updatedAt: snapshot?.savedAt ?? saved?.savedAt ?? null };
}

export async function cachedCollection<T>(owner: DatabaseOwner, table: CacheTable) {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<{ payload: string }>(`SELECT payload FROM ${table} ORDER BY updated_at DESC, id`);
  return { items: rows.map(({ payload }) => JSON.parse(payload) as T), ...await cacheAvailability(database, table) };
}

export async function cachedExercisePage(owner: DatabaseOwner, q: string, page: number, limit = 30) {
  const database = await getDatabase(owner);
  const search = q.normalize('NFC').toLocaleLowerCase('es');
  const from = "FROM exercise_cache c LEFT JOIN exercise_search s ON s.exercise_id = c.id WHERE ? = '' OR instr(s.search_text, ?) > 0";
  const count = await database.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total ${from}`, search, search);
  const rows = await database.getAllAsync<{ payload: string }>(
    `SELECT c.payload ${from}
     ORDER BY COALESCE(json_extract(c.payload, '$.isCustom'), 0), lower(json_extract(c.payload, '$.name')), c.id
     LIMIT ? OFFSET ?`, search, search, limit, (page - 1) * limit,
  );
  const total = count?.total ?? 0;
  return {
    items: rows.map(({ payload }) => JSON.parse(payload) as components['schemas']['Exercise']),
    page, limit, total, hasMore: page * limit < total,
    ...await cacheAvailability(database, 'exercise_cache'),
  };
}
