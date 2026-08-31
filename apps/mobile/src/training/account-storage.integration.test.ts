import type * as Api from '../api/client';
import type * as Db from '../db/database';
import type { useSessionStore } from '../auth/session-store';
import type { useTrainingStore } from './training-store';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    deleteItemAsync: async (key: string) => { values.delete(key); },
  };
});
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: async () => ({ isConnected: false }) } }));

// Native storage survives JS process reloads; keep its bridge outside isolateModules.
jest.requireMock('expo-sqlite');

let api: typeof Api;
let db: typeof Db;
let session: typeof useSessionStore;
let training: typeof useTrainingStore;
const originalFetch = globalThis.fetch;
let offline = false;
function startProcess() {
  jest.isolateModules(() => {
    api = jest.requireActual('../api/client');
    db = jest.requireActual('../db/database');
    session = jest.requireActual('../auth/session-store').useSessionStore;
    training = jest.requireActual('./training-store').useTrainingStore;
  });
}
beforeEach(async () => {
  await SecureStore.deleteItemAsync('evry.mobile.refresh-token');
  await SecureStore.deleteItemAsync('evry.mobile.profile-v1');
  offline = false;
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    if (offline) throw new TypeError('Network request failed');
    const request = input as Request;
    let body: unknown;
    if (request.url.endsWith('/login')) {
      const { email } = await request.json();
      body = { accessToken: email, refreshToken: email };
    } else if (request.url.endsWith('/refresh')) {
      const { refreshToken } = await request.json();
      body = { accessToken: refreshToken, refreshToken };
    } else {
      const email = request.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
      body = { id: email, email, name: email, trackCycle: false };
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  startProcess();
});
afterEach(() => { globalThis.fetch = originalFetch; });

async function login(email: string) {
  await session.getState().login(email, 'test-password');
  const scope = api.captureMobileSession();
  await training.getState().initialize(scope);
  return scope;
}

it('preserves each account workout and hides the previous one immediately on logout', async () => {
  const alice = await login('isolation-a@example.com');
  await training.getState().startWorkout('Private A');
  await training.getState().addSet('exercise-a');
  await session.getState().logout();
  expect(training.getState().activeWorkout).toBeNull();
  const bob = await login('isolation-b@example.com');
  expect(training.getState().activeWorkout).toBeNull();
  await training.getState().startWorkout('Private B');
  expect((await db.pendingSyncRows(bob))).toHaveLength(1);
  expect((await db.loadActiveWorkout(alice))?.name).toBe('Private A');
  await login('isolation-a@example.com');
  expect(training.getState().activeWorkout).toMatchObject({ name: 'Private A', sets: [{ exerciseId: 'exercise-a' }] });
});

it('reopens, edits and completes a persisted workout offline in a fresh process', async () => {
  const owner = await login('restart@example.com');
  await training.getState().startWorkout('Offline workout');
  await training.getState().addSet('exercise-a');
  const setId = training.getState().activeWorkout!.sets[0].clientId;
  await training.getState().updateSet(setId, { weightKg: 50, reps: 8 });
  offline = true;
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  expect(training.getState().activeWorkout).toMatchObject({ name: 'Offline workout', sets: [{ weightKg: 50, reps: 8 }] });
  await training.getState().updateSet(setId, { reps: 9 });
  await training.getState().finishWorkout();
  expect(training.getState().activeWorkout).toBeNull();
  const rows = await db.pendingSyncRows(owner);
  expect(JSON.parse(rows[0].payload)).toMatchObject({ status: 'COMPLETED', sets: [{ reps: 9, weightKg: 50 }] });
});

it('finishes a delayed local write in its original account without replacing the next account UI', async () => {
  const alice = await login('delayed-a@example.com');
  const connection = await db.getDatabase(alice);
  const transaction = connection.withTransactionAsync.bind(connection);
  let started!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((done) => { started = done; });
  const blocked = new Promise<void>((done) => { release = done; });
  jest.spyOn(connection, 'withTransactionAsync').mockImplementationOnce(async (operation) => {
    started();
    await blocked;
    await transaction(operation);
  });
  const firstWrite = training.getState().startWorkout('Delayed A');
  await entered;
  const bob = await login('delayed-b@example.com');
  expect(training.getState().activeWorkout).toBeNull();
  const secondWrite = training.getState().startWorkout('Current B');
  release();
  await Promise.all([firstWrite, secondWrite]);
  expect(training.getState().activeWorkout).toMatchObject({ name: 'Current B' });
  expect(await db.loadActiveWorkout(alice)).toMatchObject({ name: 'Delayed A' });
  expect(await db.loadActiveWorkout(bob)).toMatchObject({ name: 'Current B' });
});
