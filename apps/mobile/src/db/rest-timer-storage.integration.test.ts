import * as database from './database';
import type { LocalWorkout } from '../training/workout-domain';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

let number = 0;
const owner = () => ({ userId: `rest-owner-${++number}`, serverUrl: 'https://rest.invalid/api/v1' });
const workout: LocalWorkout = { clientId: 'rest-workout', revision: 0, status: 'ACTIVE', name: 'Offline',
  startedAt: '2026-10-07T12:00:00Z', notes: null, sets: [], deletedSetClientIds: [] };
const state = { mode: 'RUNNING' as const, remainingMs: 120_000, deadlineMs: 1_120_000, notificationDelivered: false };

it('adds durable timer storage to fresh databases without inventing a timer', async () => {
  const scope = owner();
  const db = await database.getDatabase(scope);
  expect(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rest_timers'"))
    .toEqual({ name: 'rest_timers' });
  expect(await database.loadRestTimer(scope, workout.clientId)).toBeNull();
});

it('isolates timer state across accounts, environments and workouts without changing training sources or queue', async () => {
  expect(typeof database.saveRestTimer).toBe('function');
  const alice = owner();
  await database.saveWorkout(alice, workout);
  const db = await database.getDatabase(alice);
  const before = await db.getAllAsync('SELECT * FROM workouts');
  await database.saveRestTimer(alice, workout.clientId, state);
  expect(await database.loadRestTimer(alice, workout.clientId)).toEqual(state);
  expect(await database.loadRestTimer(owner(), workout.clientId)).toBeNull();
  expect(await database.loadRestTimer({ ...alice, serverUrl: 'https://other.invalid/api/v1' }, workout.clientId)).toBeNull();
  expect(await database.loadRestTimer(alice, 'another-workout')).toBeNull();
  expect(await db.getAllAsync('SELECT * FROM workouts')).toEqual(before);
  expect(await database.pendingSyncRows(alice)).toEqual([]);
});

it.each(['COMPLETED', 'CANCELLED', 'DRAFT'] as const)('rejects rest writes to a %s workout preserving the previous timer', async status => {
  expect(typeof database.saveRestTimer).toBe('function');
  const scope = owner();
  await database.saveWorkout(scope, workout);
  await database.saveRestTimer(scope, workout.clientId, state);
  await database.saveWorkout(scope, { ...workout, status });
  await expect(database.saveRestTimer(scope, workout.clientId, { ...state, deadlineMs: 1_130_000 })).rejects.toThrow(/activa/);
  expect(await database.loadRestTimer(scope, workout.clientId)).toEqual(state);
});

it('rejects orphan writes and preserves malformed timer bytes instead of resetting them silently', async () => {
  expect(typeof database.saveRestTimer).toBe('function');
  const scope = owner();
  await expect(database.saveRestTimer(scope, workout.clientId, state)).rejects.toThrow(/activa/);
  await database.saveWorkout(scope, workout);
  const db = await database.getDatabase(scope);
  await db.runAsync('INSERT INTO rest_timers (workout_client_id, payload) VALUES (?, ?)', workout.clientId, '{private-damaged');
  await expect(database.loadRestTimer(scope, workout.clientId)).rejects.toThrow(/datos inválidos/);
  await expect(database.saveRestTimer(scope, workout.clientId, state)).rejects.toThrow(/datos inválidos/);
  expect(await db.getFirstAsync('SELECT payload FROM rest_timers')).toEqual({ payload: '{private-damaged' });
});

it('rolls back a timer write failure and serializes reads after a pending write', async () => {
  expect(typeof database.saveRestTimer).toBe('function');
  const scope = owner();
  await database.saveWorkout(scope, workout);
  await database.saveRestTimer(scope, workout.clientId, state);
  const db = await database.getDatabase(scope);
  await db.execAsync("CREATE TRIGGER fail_timer BEFORE UPDATE ON rest_timers BEGIN SELECT RAISE(ABORT, 'timer-write-failed'); END;");
  await expect(database.saveRestTimer(scope, workout.clientId, { ...state, deadlineMs: 1_130_000 })).rejects.toThrow('timer-write-failed');
  expect(await database.loadRestTimer(scope, workout.clientId)).toEqual(state);
  await db.execAsync('DROP TRIGGER fail_timer;');
  const next = { mode: 'PAUSED' as const, remainingMs: 88_500, deadlineMs: null, notificationDelivered: false };
  const writing = database.saveRestTimer(scope, workout.clientId, next);
  const reading = database.loadRestTimer(scope, workout.clientId);
  await writing;
  expect(await reading).toEqual(next);
});
