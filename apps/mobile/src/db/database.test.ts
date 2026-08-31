import { enqueueWorkout, getDatabase, loadActiveWorkout, markSyncAttempt, markSyncFailure, markSyncSuccess, pendingSyncRows } from './database';
import type { LocalWorkout } from '../training/workout-domain';
import type { SyncWorkoutInput } from '../api/client';
import * as SQLite from 'expo-sqlite';

// Exercise the production SQL on real SQLite; only the native Expo bridge is replaced.
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const alice = { userId: 'user-a', serverUrl: 'https://api.example.com/api/v1' };
const bob = { userId: 'user-b', serverUrl: 'https://api.example.com/api/v1' };

const workout: LocalWorkout = {
  clientId: 'local-workout', revision: 0, status: 'ACTIVE', name: 'Fuerza',
  startedAt: '2026-08-30T10:00:00.000Z', notes: null, sets: [], deletedSetClientIds: [],
};
function payload(syncId: string, name = 'Fuerza'): SyncWorkoutInput {
  return { clientId: workout.clientId, syncId, baseRevision: 0, status: 'ACTIVE', name, startedAt: workout.startedAt, sets: [], deletedSetClientIds: [] };
}

beforeEach(async () => {
  const database = await getDatabase(alice);
  await database.execAsync('DELETE FROM workouts; DELETE FROM id_mapping;');
});

it('coalesces never-sent edits into the latest persisted workout', async () => {
  await enqueueWorkout(alice, workout, 'first', payload('first'));
  await enqueueWorkout(alice, { ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));
  expect((await pendingSyncRows(alice)).map((row) => row.syncId)).toEqual(['latest']);
  expect((await loadActiveWorkout(alice))?.name).toBe('Actualizado');
});

it('replays an uncertain send unchanged before sending a newer edit with the acknowledged revision', async () => {
  await enqueueWorkout(alice, workout, 'uncertain', payload('uncertain'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'pending', 'network_error');
  await enqueueWorkout(alice, { ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));

  const retry = await pendingSyncRows(alice);
  expect(retry.map((row) => row.syncId)).toEqual(['uncertain']);
  expect(JSON.parse(retry[0].payload)).toEqual(payload('uncertain'));
  await markSyncAttempt(alice, retry[0].id);
  await markSyncSuccess(alice, retry[0], { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } });

  const next = await pendingSyncRows(alice);
  expect(next.map((row) => row.syncId)).toEqual(['latest']);
  expect(JSON.parse(next[0].payload)).toMatchObject({ baseRevision: 1, name: 'Actualizado' });
  expect(await loadActiveWorkout(alice)).toMatchObject({ revision: 1, name: 'Actualizado' });
});

it('does not expose a newer payload while the same workout has an in-flight send', async () => {
  await enqueueWorkout(alice, workout, 'in-flight', payload('in-flight'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await enqueueWorkout(alice, workout, 'latest', payload('latest'));
  expect(await pendingSyncRows(alice)).toEqual([]);
});

it('serializes a local edit with an arriving acknowledgement without losing either', async () => {
  await enqueueWorkout(alice, workout, 'first', payload('first'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await Promise.all([
    enqueueWorkout(alice, { ...workout, name: 'Última edición' }, 'latest', payload('latest', 'Última edición')),
    markSyncSuccess(alice, sent, { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } }),
  ]);
  expect(await loadActiveWorkout(alice)).toMatchObject({ revision: 1, name: 'Última edición' });
  const [next] = await pendingSyncRows(alice);
  expect(JSON.parse(next.payload)).toMatchObject({ baseRevision: 1, name: 'Última edición' });
});

it('isolates account caches and reopens the original account without deleting its data', async () => {
  const first = await getDatabase(alice);
  await first.runAsync('INSERT OR REPLACE INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)', 'private-a', '{"name":"Private A"}', '2026-08-30');
  const second = await getDatabase(bob);
  expect(await second.getAllAsync('SELECT id FROM routine_cache')).toEqual([]);
  const reopened = await getDatabase({ ...alice });
  expect(await reopened.getAllAsync('SELECT id FROM routine_cache')).toEqual([{ id: 'private-a' }]);
});

it('separates identical user IDs on different API environments', async () => {
  const first = await getDatabase(alice);
  await first.runAsync('INSERT OR REPLACE INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)', 'private-a', '{}', '2026-08-30');
  const staging = await getDatabase({ ...alice, serverUrl: 'https://staging.example.com/api/v1' });
  expect(await staging.getAllAsync('SELECT id FROM routine_cache')).toEqual([]);
});

it('preserves the unowned legacy database without copying its records into a new account', async () => {
  const legacy = await SQLite.openDatabaseAsync('evry.db');
  await legacy.execAsync('CREATE TABLE IF NOT EXISTS legacy_workouts (name TEXT); INSERT INTO legacy_workouts VALUES (\'Unassigned workout\');');
  const account = await getDatabase({ ...alice, userId: 'new-account' });
  expect(await account.getAllAsync('SELECT client_id FROM workouts')).toEqual([]);
  expect(await legacy.getAllAsync('SELECT name FROM legacy_workouts')).toEqual([{ name: 'Unassigned workout' }]);
});

it('applies an acknowledgement only to the originating database even when queue IDs collide', async () => {
  const firstOwner = { ...alice, userId: 'ack-first' };
  const secondOwner = { ...bob, userId: 'ack-second' };
  await enqueueWorkout(firstOwner, workout, 'first', payload('first'));
  await enqueueWorkout(secondOwner, { ...workout, name: 'Other account' }, 'second', payload('second', 'Other account'));
  const [first] = await pendingSyncRows(firstOwner);
  const [second] = await pendingSyncRows(secondOwner);
  expect(first.id).toBe(second.id);
  await markSyncAttempt(firstOwner, first.id);
  await markSyncSuccess(firstOwner, first, { revision: 1, mapping: { workout: { serverId: 'server-first' }, sets: [] } });
  expect(await pendingSyncRows(firstOwner)).toEqual([]);
  expect(await pendingSyncRows(secondOwner)).toEqual([second]);
  expect(await loadActiveWorkout(secondOwner)).toMatchObject({ name: 'Other account', revision: 0 });
});
