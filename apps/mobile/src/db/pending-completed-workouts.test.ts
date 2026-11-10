import { loadPendingCompletedWorkouts, saveWorkout } from './database';
import type { LocalWorkout } from '../training/workout-domain';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex') }));

it('returns only pending or syncing completed workouts for the same account', async () => {
  const alice = { userId: 'weekly-pending-a', serverUrl: 'https://example.test/api/v1' };
  const bob = { userId: 'weekly-pending-b', serverUrl: 'https://example.test/api/v1' };
  const workout: LocalWorkout = { clientId: 'pending', revision: 0, status: 'COMPLETED', name: 'Prueba',
    startedAt: '2026-11-09T12:00:00Z', endedAt: '2026-11-09T13:00:00Z', notes: null, sets: [], deletedSetClientIds: [] };
  await saveWorkout(alice, workout, 'pending');
  await saveWorkout(alice, { ...workout, clientId: 'syncing' }, 'syncing');
  await saveWorkout(alice, { ...workout, clientId: 'synced' }, 'synced');
  await saveWorkout(alice, { ...workout, clientId: 'review' }, 'requires_review');
  expect((await loadPendingCompletedWorkouts(alice)).map((item) => item.clientId).sort()).toEqual(['pending', 'syncing']);
  expect(await loadPendingCompletedWorkouts(bob)).toEqual([]);
});
