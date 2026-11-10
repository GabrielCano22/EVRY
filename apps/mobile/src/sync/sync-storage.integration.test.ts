import { syncWorkoutWithRefresh } from '../api/client';
import { enqueueWorkout, getDatabase, pendingSyncRows } from '../db/database';
import { syncPendingWorkouts } from './sync-engine';
import type { LocalWorkout } from '../training/workout-domain';
import type { SyncWorkoutInput } from '../api/client';

// The engine and transaction SQL are real. Only native bridges and the HTTP API
// boundary are substituted; SQLite executes in an isolated in-memory database.
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: async () => ({ isConnected: true }) } }));
jest.mock('../api/client', () => ({ isCurrentMobileSession: () => true, syncWorkoutWithRefresh: jest.fn() }));

const owner = { userId: 'outbox-user', serverUrl: 'https://api.example.com/api/v1', version: 1 };
const workout: LocalWorkout = { clientId: 'outbox-workout', revision: 0, status: 'ACTIVE',
  name: 'Offline', startedAt: '2026-08-30T10:00:00Z', notes: 'Private local note', sets: [], deletedSetClientIds: [] };
const input: SyncWorkoutInput = { clientId: workout.clientId, syncId: 'outbox-sync', baseRevision: 0,
  name: workout.name, startedAt: workout.startedAt, status: 'ACTIVE', sets: [], deletedSetClientIds: [] };
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(syncWorkoutWithRefresh).mockRejectedValue(new Error('network failure'));
  const database = await getDatabase(owner);
  await database.execAsync('DELETE FROM workouts; DELETE FROM id_mapping;');
});

it('does not mark a newer replacement using a stale damaged snapshot', async () => {
  await enqueueWorkout(owner, workout, input.syncId, input);
  const [row] = await pendingSyncRows(owner);
  const database = await getDatabase(owner);
  await database.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', '{}', row.id);
  const read = database.getAllAsync.bind(database);
  const spy = jest.spyOn(database, 'getAllAsync').mockImplementationOnce(async (sql, ...parameters) => {
    const snapshot = await read(sql, ...parameters);
    await database.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', JSON.stringify(input), row.id);
    return snapshot;
  });
  try {
    await syncPendingWorkouts(owner);
    expect(syncWorkoutWithRefresh).toHaveBeenCalledWith(input, owner);
    expect(await database.getFirstAsync('SELECT state, attempts, payload, last_error FROM sync_queue WHERE id = ?', row.id))
      .toEqual({ state: 'pending', attempts: 1, payload: JSON.stringify(input),
        last_error: JSON.stringify({ code: 'network_error', serverVersion: null }) });
  } finally { spy.mockRestore(); }
});

it.each(['{"private-note":', '{}', JSON.stringify({ ...input, clientId: 'another-workout' }),
  JSON.stringify({ ...input, sets: [null] })])('preserves damaged outbox without uploading or discarding newer rows: %s', async (raw) => {
  await enqueueWorkout(owner, workout, input.syncId, input);
  const [row] = await pendingSyncRows(owner);
  const database = await getDatabase(owner);
  await database.runAsync(`INSERT INTO id_mapping (entity_type, client_id, server_id, updated_at)
    VALUES ('workout', ?, 'server-existing', ?)`, workout.clientId, workout.startedAt);
  await database.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', raw, row.id);
  // Preserve a later queued snapshot behind the damaged entry.
  await database.runAsync(`INSERT INTO sync_queue (sync_id, workout_client_id, payload, state, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?)`, 'later-sync', workout.clientId,
  JSON.stringify({ ...input, syncId: 'later-sync' }), workout.startedAt, workout.startedAt);
  const source = await database.getAllAsync('SELECT client_id, payload, revision FROM workouts');
  const mappings = await database.getAllAsync('SELECT * FROM id_mapping');
  await syncPendingWorkouts(owner);

  expect(syncWorkoutWithRefresh).not.toHaveBeenCalled();
  expect(await database.getAllAsync('SELECT client_id, payload, revision FROM workouts')).toEqual(source);
  expect(await database.getAllAsync('SELECT * FROM id_mapping')).toEqual(mappings);
  expect(await database.getFirstAsync('SELECT state, attempts, payload FROM sync_queue WHERE id = ?', row.id))
    .toEqual({ state: 'requires_review', attempts: 0, payload: raw });
  expect(await database.getAllAsync('SELECT sync_id, state FROM sync_queue ORDER BY id'))
    .toEqual([{ sync_id: input.syncId, state: 'requires_review' }, { sync_id: 'later-sync', state: 'pending' }]);
  expect(await database.getFirstAsync('SELECT last_error FROM sync_queue WHERE id = ?', row.id))
    .toEqual({ last_error: JSON.stringify({ code: 'LOCAL_SYNC_PAYLOAD_INVALID', serverVersion: null }) });
  expect(await pendingSyncRows(owner)).toEqual([]);
});
