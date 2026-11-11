import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { components } from '@evry/api-client';
import {
  decodeRestPreferences, decodeRestTimer, DEFAULT_REST_PREFERENCES,
  type RestPreferences, type RestTimerState,
} from '@evry/domain';
import type { LocalWorkout } from '../training/workout-domain';
import { decodeStoredWorkout, workoutSnapshotsEqual, type StoredWorkoutRow } from './stored-workout';
import { aggregateSyncState, type SyncQueueState } from '../sync/queue-policy';
import { canonicalWorkoutFromServer, hasSyncIdentities } from '../sync/conflict-resolution';
import { rebaseSyncPayload, rebaseWorkoutRevisions } from '../sync/revisions';
import { recoveryWorkoutFromUnknown, type SyncCanonicalWorkoutForRecovery, type SyncWorkoutInput } from '../api/client';

export interface DatabaseOwner {
  readonly userId: string;
  readonly serverUrl: string;
}
const DATABASE_VERSION = 5;

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
  serverVersion: SyncCanonicalWorkoutForRecovery | null;
}

const connections = new Map<string, Promise<SQLite.SQLiteDatabase>>();
const writeQueues = new WeakMap<SQLite.SQLiteDatabase, Promise<void>>();
let lastMediaAccessTime = 0;
let mediaAccessSequence = 0;

function mediaAccessStamp(): string {
  const time = Math.max(Date.now(), lastMediaAccessTime);
  mediaAccessSequence = time === lastMediaAccessTime ? mediaAccessSequence + 1 : 0;
  lastMediaAccessTime = time;
  return `${new Date(time).toISOString()}~${String(mediaAccessSequence).padStart(8, '0')}`;
}

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
      try {
        await migrate(database);
        await database.execAsync(`
          UPDATE sync_queue SET state = 'pending' WHERE state = 'syncing';
          UPDATE workouts SET sync_state = 'pending' WHERE sync_state = 'syncing';
        `);
        return database;
      } catch (error) {
        // No consumer receives this connection until preparation succeeds.
        // Release its native handle before allowing another attempt, never
        // delete the account file or replace the original preparation error.
        try { await database.closeAsync(); } catch { /* Preserve the original failure. */ }
        throw error;
      }
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
  const current = version?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return;
  if (current < 2) await migrateBaseSchema(database);
  if (current < 3) await migrateRestTimers(database);
  if (current < 4) await migrateRestPreferences(database);
  await migrateUiPreferences(database);
}

async function migrateBaseSchema(database: SQLite.SQLiteDatabase): Promise<void> {
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
        try {
          const entity: unknown = JSON.parse(row.payload);
          if (typeof entity === 'object' && entity !== null && !Array.isArray(entity)) {
            await indexExercise(database, row.id, entity);
          }
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
      }
      cursor = rows[rows.length - 1].id;
    }
    await database.execAsync('PRAGMA user_version = 2;');
  });
}

async function migrateRestTimers(database: SQLite.SQLiteDatabase): Promise<void> {
  await writeTransaction(database, async () => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS rest_timers (
        workout_client_id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        FOREIGN KEY(workout_client_id) REFERENCES workouts(client_id) ON DELETE CASCADE
      );
      PRAGMA user_version = 3;
    `);
  });
}

async function migrateRestPreferences(database: SQLite.SQLiteDatabase): Promise<void> {
  await writeTransaction(database, async () => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS rest_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      );
      PRAGMA user_version = 4;
    `);
  });
}

async function migrateUiPreferences(database: SQLite.SQLiteDatabase): Promise<void> {
  await writeTransaction(database, async () => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS ui_preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 5;
    `);
  });
}

/** Small non-training UI choices that must survive a restart, per account. */
export async function loadUiPreference(owner: DatabaseOwner, key: string): Promise<string | null> {
  const database = await getDatabase(owner);
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM ui_preferences WHERE key = ?', key);
  return row?.value ?? null;
}

export async function saveUiPreference(owner: DatabaseOwner, key: string, value: string): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync(
      'INSERT INTO ui_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key, value,
    );
  });
}

export async function loadRestPreferences(owner: DatabaseOwner): Promise<RestPreferences> {
  const database = await getDatabase(owner);
  const row = await database.getFirstAsync<{ payload: string }>('SELECT payload FROM rest_preferences WHERE id = 1');
  if (!row) return DEFAULT_REST_PREFERENCES;
  try {
    return decodeRestPreferences(JSON.parse(row.payload));
  } catch {
    // A preference is not training data: fall back to design defaults instead of
    // blocking the session on a damaged row.
    return DEFAULT_REST_PREFERENCES;
  }
}

export async function saveRestPreferences(owner: DatabaseOwner, preferences: RestPreferences): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync(
      'INSERT INTO rest_preferences (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
      JSON.stringify(preferences),
    );
  });
}

function storedRestTimer(payload: string): RestTimerState {
  try { return decodeRestTimer(JSON.parse(payload)); }
  catch { throw new Error('El descanso guardado contiene datos inválidos. Los datos locales se conservan.'); }
}

export async function loadRestTimer(owner: DatabaseOwner, workoutClientId: string): Promise<RestTimerState | null> {
  const database = await getDatabase(owner);
  // Reads also wait for queued writes: reopening a screen must not hydrate an
  // older timer while its previous screen's native write is still finishing.
  return writeTransaction(database, async () => {
    const row = await database.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM rest_timers WHERE workout_client_id = ?', workoutClientId,
    );
    return row ? storedRestTimer(row.payload) : null;
  });
}

export async function saveRestTimer(owner: DatabaseOwner, workoutClientId: string, state: RestTimerState): Promise<void> {
  const valid = decodeRestTimer(state);
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    const workout = await database.getFirstAsync<StoredWorkoutRow>(
      'SELECT client_id, revision, status, payload FROM workouts WHERE client_id = ?', workoutClientId,
    );
    if (!workout || workout.status !== 'ACTIVE') throw new Error('El descanso requiere una sesión activa guardada.');
    decodeStoredWorkout(workout);
    const previous = await database.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM rest_timers WHERE workout_client_id = ?', workoutClientId,
    );
    if (previous) storedRestTimer(previous.payload);
    await database.runAsync(`INSERT INTO rest_timers (workout_client_id, payload) VALUES (?, ?)
      ON CONFLICT(workout_client_id) DO UPDATE SET payload = excluded.payload`, workoutClientId, JSON.stringify(valid));
  });
}

export async function readMediaCache(owner: DatabaseOwner, url: string): Promise<{ uri: string; bytes: number } | null> {
  const database = await getDatabase(owner);
  const row = await database.getFirstAsync<{ local_uri: string; bytes: number }>(
    'SELECT local_uri, bytes FROM media_cache WHERE url = ?', url,
  );
  return row ? { uri: row.local_uri, bytes: row.bytes } : null;
}

export async function listMediaCache(owner: DatabaseOwner): Promise<{ url: string; uri: string; bytes: number }[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<{ url: string; local_uri: string; bytes: number }>(
    'SELECT url, local_uri, bytes FROM media_cache ORDER BY last_access_at ASC, url ASC',
  );
  return rows.map((row) => ({ url: row.url, uri: row.local_uri, bytes: row.bytes }));
}

async function pruneMediaCache(
  database: SQLite.SQLiteDatabase,
  maxBytes: number,
  evict?: (entry: { url: string; uri: string }) => Promise<void> | void,
  protectedUrl?: string,
): Promise<{ url: string; uri: string }[]> {
  const rows = await database.getAllAsync<{ url: string; local_uri: string; bytes: number }>(
    'SELECT url, local_uri, bytes FROM media_cache ORDER BY last_access_at ASC, url ASC',
  );
  let total = rows.reduce((sum, row) => sum + row.bytes, 0);
  const evicted: { url: string; uri: string }[] = [];
  for (const row of rows) {
    if (total <= maxBytes) break;
    if (row.url === protectedUrl) continue;
    const entry = { url: row.url, uri: row.local_uri };
    await evict?.(entry);
    await database.runAsync('DELETE FROM media_cache WHERE url = ?', row.url);
    evicted.push(entry);
    total -= row.bytes;
  }
  return evicted;
}

export async function trimMediaCache(
  owner: DatabaseOwner,
  maxBytes: number,
  evict: (entry: { url: string; uri: string }) => Promise<void> | void,
): Promise<void> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('El presupuesto de medios debe ser positivo.');
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => { await pruneMediaCache(database, maxBytes, evict); });
}

export async function touchMediaCache(owner: DatabaseOwner, url: string): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync('UPDATE media_cache SET last_access_at = ? WHERE url = ?', mediaAccessStamp(), url);
  });
}

export async function forgetMediaCache(owner: DatabaseOwner, url: string): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync('DELETE FROM media_cache WHERE url = ?', url);
  });
}

export async function rememberMediaCache(
  owner: DatabaseOwner,
  url: string,
  uri: string,
  bytes: number,
  maxBytes: number,
  evict?: (entry: { url: string; uri: string }) => Promise<void> | void,
): Promise<{ retained: boolean; evicted: { url: string; uri: string }[] }> {
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('El tamaño y el presupuesto de medios deben ser enteros positivos.');
  }
  if (bytes > maxBytes) return { retained: false, evicted: [] };

  const database = await getDatabase(owner);
  return writeTransaction(database, async () => {
    await database.runAsync(
      `INSERT INTO media_cache (url, local_uri, bytes, last_access_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET local_uri = excluded.local_uri, bytes = excluded.bytes,
         last_access_at = excluded.last_access_at`,
      url, uri, bytes, mediaAccessStamp(),
    );
    const evicted = await pruneMediaCache(database, maxBytes, evict, url);
    return { retained: true, evicted };
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
  const row = await database.getFirstAsync<StoredWorkoutRow>(
    "SELECT client_id, revision, status, payload FROM workouts WHERE status = 'ACTIVE' LIMIT 1",
  );
  return row ? decodeStoredWorkout(row) : null;
}

export async function loadRecoveredDrafts(owner: DatabaseOwner): Promise<LocalWorkout[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<StoredWorkoutRow>(
    "SELECT client_id, revision, status, payload FROM workouts WHERE status = 'DRAFT' ORDER BY updated_at DESC LIMIT 20",
  );
  return rows.map(decodeStoredWorkout);
}

/** Local completed sessions not yet confirmed by the server, scoped to the owner database. */
export async function loadPendingCompletedWorkouts(owner: DatabaseOwner): Promise<LocalWorkout[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<StoredWorkoutRow>(
    "SELECT client_id, revision, status, payload FROM workouts WHERE status = 'COMPLETED' AND sync_state IN ('pending', 'syncing') ORDER BY updated_at DESC",
  );
  return rows.map(decodeStoredWorkout);
}

export async function enqueueWorkout(
  owner: DatabaseOwner,
  workout: LocalWorkout,
  syncId: string,
  payload: SyncWorkoutInput,
  draftToArchive?: LocalWorkout,
): Promise<SyncQueueState> {
  if (draftToArchive && (draftToArchive.status !== 'DRAFT' || draftToArchive.clientId === workout.clientId)) {
    throw new Error('Solo se puede archivar un borrador distinto de la sesión recuperada.');
  }
  const database = await getDatabase(owner);
  let syncState: SyncQueueState = 'pending';
  await writeTransaction(database, async () => {
    let archiveSource: LocalWorkout | undefined;
    if (draftToArchive) {
      const source = await database.getFirstAsync<StoredWorkoutRow>(
        'SELECT client_id, revision, status, payload FROM workouts WHERE client_id = ?',
        draftToArchive.clientId,
      );
      if (source) archiveSource = decodeStoredWorkout(source);
      if (!archiveSource || archiveSource.status !== 'DRAFT'
        || !workoutSnapshotsEqual(archiveSource, draftToArchive)) {
        throw new Error('El borrador cambió. Actualiza los borradores y revisa la versión guardada antes de recuperarlo.');
      }
    }
    const stored = await database.getFirstAsync<StoredWorkoutRow>(
      'SELECT client_id, revision, status, payload FROM workouts WHERE client_id = ?',
      workout.clientId,
    );
    const canonicalSets = stored ? decodeStoredWorkout(stored).sets : [];
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
    } else {
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
    }
    if (archiveSource) {
      // This freshly decoded object belongs only to this transaction, not the
      // caller. Retain literal JSON extension keys that loose spread transforms
      // can lose through Object.assign's inherited setters.
      archiveSource.status = 'CANCELLED';
      archiveSource.cancelledAt = new Date().toISOString();
      await persistWorkout(database, archiveSource, 'synced');
    }
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

export async function markInvalidSyncPayload(owner: DatabaseOwner, row: PendingSyncRow): Promise<boolean> {
  const database = await getDatabase(owner);
  return writeTransaction(database, async () => {
    // Compare the observed snapshot before flagging it. Preserve every queued
    // payload, including later edits; this is not a server revision conflict.
    const result = await database.runAsync(
      `UPDATE sync_queue SET state = 'requires_review', last_error = ?, updated_at = ?
       WHERE id = ? AND sync_id = ? AND workout_client_id = ? AND state = 'pending' AND payload = ?`,
      JSON.stringify({ code: 'LOCAL_SYNC_PAYLOAD_INVALID', serverVersion: null }),
      new Date().toISOString(), row.id, row.syncId, row.workoutClientId, row.payload,
    );
    if (result.changes === 0) return false;
    await database.runAsync("UPDATE workouts SET sync_state = 'requires_review' WHERE client_id = ?", row.workoutClientId);
    return true;
  });
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
  serverVersion?: SyncCanonicalWorkoutForRecovery | null,
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
  const rows = await database.getAllAsync<StoredWorkoutRow & {
    workoutClientId: string;
    payload: string;
    lastError: string | null;
  }>(
    `SELECT q.workout_client_id AS workoutClientId, w.client_id, w.revision, w.status, w.payload, q.last_error AS lastError
     FROM sync_queue q JOIN workouts w ON w.client_id = q.workout_client_id
     WHERE q.state = 'requires_review' ORDER BY q.updated_at DESC`,
  );
  return rows.map((row) => {
    const workout = decodeStoredWorkout(row);
    let code: string | undefined;
    let serverVersion: SyncCanonicalWorkoutForRecovery | null = null;
    try {
      const error = JSON.parse(row.lastError ?? '{}');
      const record = typeof error === 'object' && error !== null && !Array.isArray(error) ? error : null;
      code = record && typeof record.code === 'string' ? record.code : undefined;
      serverVersion = record ? recoveryWorkoutFromUnknown(record.serverVersion) : null;
    } catch { code = row.lastError ?? undefined; }
    return {
      workoutClientId: row.workoutClientId,
      workoutName: workout.name,
      errorCode: code ?? 'CONFLICT',
      serverVersion,
    };
  });
}

export async function keepReviewAsDraft(owner: DatabaseOwner, workoutClientId: string): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    const row = await database.getFirstAsync<StoredWorkoutRow>(
      'SELECT client_id, revision, status, payload FROM workouts WHERE client_id = ?',
      workoutClientId,
    );
    if (!row) return;
    const workout = decodeStoredWorkout(row);
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

export async function continueServerWorkout(
  owner: DatabaseOwner,
  review: SyncReview,
  prepareServerVersion?: (server: SyncCanonicalWorkoutForRecovery) => Promise<SyncCanonicalWorkoutForRecovery>,
): Promise<void> {
  if (!review.serverVersion) throw new Error('El servidor no devolvió una sesión recuperable.');
  const database = await getDatabase(owner);
  const readSnapshot = () => database.getFirstAsync<{
    payload: string; revision: number; status: string; queueId: number; lastError: string | null;
  }>(
    `SELECT w.payload, w.revision, w.status, q.id AS queueId, q.last_error AS lastError
     FROM workouts w JOIN sync_queue q ON q.workout_client_id = w.client_id
     WHERE w.client_id = ? AND q.state = 'requires_review' ORDER BY q.id LIMIT 1`,
    review.workoutClientId,
  );
  const changedMessage = 'La sesión local cambió. Revisa los datos guardados antes de continuar la del servidor.';
  // Never hold a SQLite transaction across a network request. Capture the
  // disputed rows, then compare under the same write lock as the replacement.
  const snapshot = await writeTransaction(database, readSnapshot);
  if (!snapshot) throw new Error(changedMessage);
  const server = !hasSyncIdentities(review.serverVersion) && prepareServerVersion
    ? await prepareServerVersion(review.serverVersion)
    : review.serverVersion;
  const canonical = canonicalWorkoutFromServer(server);
  await writeTransaction(database, async () => {
    const current = await readSnapshot();
    if (!current || JSON.stringify(current) !== JSON.stringify(snapshot)) {
      throw new Error(changedMessage);
    }
    if (canonical.status === 'ACTIVE') {
      const otherActive = await database.getFirstAsync<{ clientId: string }>(
        "SELECT client_id AS clientId FROM workouts WHERE status = 'ACTIVE' AND client_id <> ? LIMIT 1",
        review.workoutClientId,
      );
      if (otherActive) throw new Error('Finaliza la sesión local activa antes de continuar la del servidor.');
    }
    if (canonical.clientId !== review.workoutClientId) {
      const cached = await database.getFirstAsync<{
        serverId: string | null; revision: number; status: string; syncState: string; queued: number;
      }>(
        `SELECT w.server_id AS serverId, w.revision, w.status, w.sync_state AS syncState,
          EXISTS(SELECT 1 FROM sync_queue q WHERE q.workout_client_id = w.client_id) AS queued
         FROM workouts w WHERE w.client_id = ?`,
        canonical.clientId,
      );
      // A recovered draft leaves its former synced identity archived locally.
      // Reuse only that known server copy; preserve other drafts and outboxes.
      if (cached && (cached.status !== 'CANCELLED' || cached.syncState !== 'synced'
        || cached.serverId !== server.id || cached.revision > canonical.revision || cached.queued !== 0)) {
        throw new Error(changedMessage);
      }
    }
    await database.runAsync('DELETE FROM sync_queue WHERE workout_client_id = ?', review.workoutClientId);
    await database.runAsync('DELETE FROM workouts WHERE client_id = ?', review.workoutClientId);
    await database.runAsync(
      `INSERT INTO workouts (client_id, server_id, revision, status, sync_state, payload, updated_at)
       VALUES (?, ?, ?, ?, 'synced', ?, ?)
       ON CONFLICT(client_id) DO UPDATE SET
         server_id = excluded.server_id,
         revision = excluded.revision,
         status = excluded.status,
         sync_state = excluded.sync_state,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
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
    const stored = await database.getFirstAsync<StoredWorkoutRow>(
      'SELECT client_id, revision, status, payload FROM workouts WHERE client_id = ?',
      row.workoutClientId,
    );
    const rebased = stored
      ? rebaseWorkoutRevisions(decodeStoredWorkout(stored), result.revision, result.mapping.sets ?? [])
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

export async function cachedCollection<T>(owner: DatabaseOwner, table: CacheTable, valid: (value: unknown) => value is T) {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<{ payload: string }>(`SELECT payload FROM ${table} ORDER BY updated_at DESC, id`);
  const items: T[] = [];
  let damaged = 0;
  for (const { payload } of rows) {
    try {
      const item: unknown = JSON.parse(payload);
      if (valid(item)) items.push(item);
      else damaged += 1;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      damaged += 1;
    }
  }
  return { items, damaged, ...await cacheAvailability(database, table) };
}

/** Read only the groups of exercises used by this workout, from its owner's cache. */
export async function cachedExerciseGroups(owner: DatabaseOwner, exerciseIds: readonly string[]) {
  type MuscleGroup = components['schemas']['ExerciseListItemDto']['muscleGroup'];
  const validGroups = new Set<MuscleGroup>(['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS',
    'CORE', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'FULL_BODY', 'CARDIO']);
  const ids = [...new Set(exerciseIds)];
  if (!ids.length) return [];
  const database = await getDatabase(owner);
  const result: { id: string; muscleGroup: MuscleGroup }[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const rows = await database.getAllAsync<{ id: string; payload: string }>(
      `SELECT id, payload FROM exercise_cache WHERE id IN (${batch.map(() => '?').join(',')})`, ...batch,
    );
    for (const row of rows) {
      try {
        const value: unknown = JSON.parse(row.payload);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
        const record = value as Record<string, unknown>;
        if (record.id === row.id && typeof record.muscleGroup === 'string' && validGroups.has(record.muscleGroup as MuscleGroup)) {
          result.push({ id: row.id, muscleGroup: record.muscleGroup as MuscleGroup });
        }
      } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    }
  }
  return result;
}

export interface CachedExerciseSummary {
  id: string;
  name: string;
  muscleGroup: string | null;
  category: string | null;
  imageUrl: string | null;
  imagePath: string | null;
}

/**
 * Names and media for the exercises of the active session. The session payload
 * only stores exercise ids, and the catalog page may not include them when the
 * screen opens offline, so this reads the owner-scoped cache.
 */
export async function cachedExerciseSummaries(
  owner: DatabaseOwner,
  exerciseIds: readonly string[],
): Promise<CachedExerciseSummary[]> {
  const ids = [...new Set(exerciseIds)];
  if (!ids.length) return [];
  const database = await getDatabase(owner);
  const result: CachedExerciseSummary[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const rows = await database.getAllAsync<{ id: string; payload: string }>(
      `SELECT id, payload FROM exercise_cache WHERE id IN (${batch.map(() => '?').join(',')})`, ...batch,
    );
    for (const row of rows) {
      try {
        const value: unknown = JSON.parse(row.payload);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
        const record = value as Record<string, unknown>;
        if (record.id !== row.id || typeof record.name !== 'string' || record.name.trim() === '') continue;
        result.push({
          id: row.id,
          name: record.name,
          muscleGroup: typeof record.muscleGroup === 'string' ? record.muscleGroup : null,
          category: typeof record.category === 'string' ? record.category : null,
          imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
          imagePath: typeof record.imagePath === 'string' ? record.imagePath : null,
        });
      } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
    }
  }
  return result;
}

export async function cachedExercisePage(owner: DatabaseOwner, q: string, page: number, limit = 30) {
  const database = await getDatabase(owner);
  const search = q.normalize('NFC').toLocaleLowerCase('es');
  const valid = "CASE WHEN json_valid(c.payload) = 1 THEN json_type(c.payload) = 'object' AND json_type(c.payload, '$.id') = 'text' AND json_type(c.payload, '$.name') = 'text' ELSE 0 END";
  const from = `FROM exercise_cache c LEFT JOIN exercise_search s ON s.exercise_id = c.id WHERE (${valid}) = 1 AND (? = '' OR instr(s.search_text, ?) > 0)`;
  const count = await database.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total ${from}`, search, search);
  const damagedCount = await database.getFirstAsync<{ damaged: number }>(`SELECT COUNT(*) AS damaged FROM exercise_cache c WHERE (${valid}) = 0`);
  const rows = await database.getAllAsync<{ payload: string }>(
    `SELECT c.payload ${from}
     ORDER BY COALESCE(json_extract(c.payload, '$.isCustom'), 0), lower(json_extract(c.payload, '$.name')), c.id
     LIMIT ? OFFSET ?`, search, search, limit, (page - 1) * limit,
  );
  const total = count?.total ?? 0;
  return {
    items: rows.map(({ payload }) => JSON.parse(payload) as components['schemas']['ExerciseListItemDto']),
    page, limit, total, hasMore: page * limit < total, damaged: damagedCount?.damaged ?? 0,
    ...await cacheAvailability(database, 'exercise_cache'),
  };
}
