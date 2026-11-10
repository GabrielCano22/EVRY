import { cachedExerciseGroups, getDatabase } from './database';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

it('reads valid requested groups only from the current account and skips damaged cache entries', async () => {
  const alice = { userId: 'muscle-test-a', serverUrl: 'https://example.test/api/v1' };
  const bob = { userId: 'muscle-test-b', serverUrl: 'https://example.test/api/v1' };
  const db = await getDatabase(alice);
  const now = '2026-11-08T12:00:00Z';
  for (const [id, payload] of [
    ['valid', JSON.stringify({ id: 'valid', muscleGroup: 'CHEST' })],
    ['mismatch', JSON.stringify({ id: 'another', muscleGroup: 'QUADS' })],
    ['unknown', JSON.stringify({ id: 'unknown', muscleGroup: '__proto__' })],
    ['damaged', '{'],
  ]) {
    await db.runAsync('INSERT OR REPLACE INTO exercise_cache (id, payload, updated_at, last_access_at) VALUES (?, ?, ?, ?)', id, payload, now, now);
  }
  expect(await cachedExerciseGroups(alice, ['valid', 'valid', 'mismatch', 'unknown', 'damaged', 'missing']))
    .toEqual([{ id: 'valid', muscleGroup: 'CHEST' }]);
  expect(await cachedExerciseGroups(bob, ['valid'])).toEqual([]);
  expect(await cachedExerciseGroups(alice, [])).toEqual([]);
});
