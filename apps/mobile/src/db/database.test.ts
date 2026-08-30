import { enqueueWorkout, getDatabase, loadActiveWorkout, markSyncAttempt, markSyncFailure, markSyncSuccess, pendingSyncRows } from './database';
import type { LocalWorkout } from '../training/workout-domain';
import type { SyncWorkoutInput } from '../api/client';

// Exercise the production SQL on real SQLite; only the native Expo bridge is replaced.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    const { DatabaseSync } = jest.requireActual('node:sqlite');
    const sqlite = new DatabaseSync(':memory:');
    return {
      execAsync: async (sql: string) => sqlite.exec(sql),
      getFirstAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).get(...params) ?? null,
      getAllAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).all(...params),
      runAsync: async (sql: string, ...params: unknown[]) => sqlite.prepare(sql).run(...params),
      withTransactionAsync: async (operation: () => Promise<void>) => {
        sqlite.exec('BEGIN');
        try { await operation(); sqlite.exec('COMMIT'); }
        catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    };
  },
}));

const workout: LocalWorkout = {
  clientId: 'local-workout', revision: 0, status: 'ACTIVE', name: 'Fuerza',
  startedAt: '2026-08-30T10:00:00.000Z', notes: null, sets: [], deletedSetClientIds: [],
};
function payload(syncId: string, name = 'Fuerza'): SyncWorkoutInput {
  return { clientId: workout.clientId, syncId, baseRevision: 0, status: 'ACTIVE', name, startedAt: workout.startedAt, sets: [], deletedSetClientIds: [] };
}

beforeEach(async () => {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM workouts; DELETE FROM id_mapping;');
});

it('coalesces never-sent edits into the latest persisted workout', async () => {
  await enqueueWorkout(workout, 'first', payload('first'));
  await enqueueWorkout({ ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));
  expect((await pendingSyncRows()).map((row) => row.syncId)).toEqual(['latest']);
  expect((await loadActiveWorkout())?.name).toBe('Actualizado');
});

it('replays an uncertain send unchanged before sending a newer edit with the acknowledged revision', async () => {
  await enqueueWorkout(workout, 'uncertain', payload('uncertain'));
  const [sent] = await pendingSyncRows();
  await markSyncAttempt(sent.id);
  await markSyncFailure(sent.id, workout.clientId, 'pending', 'network_error');
  await enqueueWorkout({ ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));

  const retry = await pendingSyncRows();
  expect(retry.map((row) => row.syncId)).toEqual(['uncertain']);
  expect(JSON.parse(retry[0].payload)).toEqual(payload('uncertain'));
  await markSyncAttempt(retry[0].id);
  await markSyncSuccess(retry[0], { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } });

  const next = await pendingSyncRows();
  expect(next.map((row) => row.syncId)).toEqual(['latest']);
  expect(JSON.parse(next[0].payload)).toMatchObject({ baseRevision: 1, name: 'Actualizado' });
  expect(await loadActiveWorkout()).toMatchObject({ revision: 1, name: 'Actualizado' });
});

it('does not expose a newer payload while the same workout has an in-flight send', async () => {
  await enqueueWorkout(workout, 'in-flight', payload('in-flight'));
  const [sent] = await pendingSyncRows();
  await markSyncAttempt(sent.id);
  await enqueueWorkout(workout, 'latest', payload('latest'));
  expect(await pendingSyncRows()).toEqual([]);
});

it('serializes a local edit with an arriving acknowledgement without losing either', async () => {
  await enqueueWorkout(workout, 'first', payload('first'));
  const [sent] = await pendingSyncRows();
  await markSyncAttempt(sent.id);
  await Promise.all([
    enqueueWorkout({ ...workout, name: 'Última edición' }, 'latest', payload('latest', 'Última edición')),
    markSyncSuccess(sent, { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } }),
  ]);
  expect(await loadActiveWorkout()).toMatchObject({ revision: 1, name: 'Última edición' });
  const [next] = await pendingSyncRows();
  expect(JSON.parse(next.payload)).toMatchObject({ baseRevision: 1, name: 'Última edición' });
});
