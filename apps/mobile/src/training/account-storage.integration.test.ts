import type * as Api from '../api/client';
import type * as Db from '../db/database';
import type { useSessionStore } from '../auth/session-store';
import type { useTrainingStore } from './training-store';
import * as SecureStore from 'expo-secure-store';
import { finishRestTimer, pauseRestTimer, remainingRestMs, resumeRestTimer, startRestTimer } from '@evry/domain';

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

it('recovers running and paused rest offline across JS restarts and retains completion acknowledgement without changing the outbox', async () => {
  const owner = await login('rest-restart@example.com');
  await training.getState().startWorkout('Descanso offline');
  const workoutId = training.getState().activeWorkout!.clientId;
  const source = await db.loadActiveWorkout(owner);
  const queue = await db.pendingSyncRows(owner);
  const started = startRestTimer(120, 1_000_000);
  await db.saveRestTimer(owner, workoutId, started);
  offline = true;
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  const recovered = await db.loadRestTimer(owner, workoutId);
  expect(recovered).toEqual(started);
  expect(remainingRestMs(recovered!, 1_031_500)).toBe(88_500);
  await db.saveRestTimer(owner, workoutId, pauseRestTimer(recovered!, 1_031_500));
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  const paused = await db.loadRestTimer(owner, workoutId);
  expect(paused).toMatchObject({ mode: 'PAUSED', remainingMs: 88_500, deadlineMs: null });
  expect(remainingRestMs(paused!, 2_000_000)).toBe(88_500);
  const finished = finishRestTimer(resumeRestTimer(paused!, 2_000_000), 2_088_500);
  await db.saveRestTimer(owner, workoutId, { ...finished, notificationDelivered: true });
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  expect(await db.loadRestTimer(owner, workoutId)).toEqual({ mode: 'FINISHED', remainingMs: 0, deadlineMs: null, notificationDelivered: true });
  expect(await db.loadActiveWorkout(owner)).toEqual(source);
  expect(await db.pendingSyncRows(owner)).toEqual(queue);
});

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

it('reopens nullable timed-set details and completes offline without fabricating repetitions', async () => {
  const owner = await login('timed-parity@example.com');
  await training.getState().startWorkout('Sesión por tiempo');
  await training.getState().addSet('timed-exercise');
  const setId = training.getState().activeWorkout!.sets[0].clientId;
  await training.getState().updateSet(setId, {
    weightKg: null, reps: null, durationS: 45, rpe: 8, isWarmup: true, techniqueStable: false,
  });
  offline = true;
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  expect(training.getState().activeWorkout?.sets[0]).toMatchObject({
    clientId: setId, weightKg: null, reps: null, durationS: 45, rpe: 8,
    isWarmup: true, techniqueStable: false,
  });
  await training.getState().updateSet(setId, { rpe: null, techniqueStable: null });
  await training.getState().finishWorkout();
  expect(training.getState().activeWorkout).toBeNull();
  const rows = await db.pendingSyncRows(owner);
  expect(JSON.parse(rows[0].payload)).toMatchObject({ status: 'COMPLETED', sets: [{
    clientId: setId, weightKg: null, reps: null, durationS: 45, rpe: null,
    isWarmup: true, techniqueStable: null,
  }] });
});

it('blocks offline initialization on damaged saved data without replacing the session', async () => {
  const owner = await login('damaged-restart@example.com');
  await training.getState().startWorkout('Protected session');
  const connection = await db.getDatabase(owner);
  const queue = await db.pendingSyncRows(owner);
  await connection.runAsync('UPDATE workouts SET payload = ?', '{}');
  offline = true;
  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());

  expect(training.getState()).toMatchObject({
    ready: false, activeWorkout: null, localSaveState: 'failed',
    error: 'La sesión guardada contiene datos inválidos. Los datos locales se conservan.',
  });
  await training.getState().startWorkout('Must not overwrite');
  expect(await connection.getAllAsync('SELECT payload FROM workouts')).toEqual([{ payload: '{}' }]);
  expect(await db.pendingSyncRows(owner)).toEqual(queue);
});

it('persists a cancelled workout offline and does not reopen it as active', async () => {
  const owner = await login('cancel-offline@example.com');
  await training.getState().startWorkout('Sesión cancelada');
  offline = true;
  await training.getState().cancelWorkout();

  expect(training.getState().activeWorkout).toBeNull();
  expect(await db.loadActiveWorkout(owner)).toBeNull();
  const rows = await db.pendingSyncRows(owner);
  expect(rows).toHaveLength(1);
  expect(JSON.parse(rows[0].payload)).toMatchObject({ status: 'CANCELLED', cancelledAt: expect.any(String) });

  startProcess();
  await session.getState().initialize();
  await training.getState().initialize(api.captureMobileSession());
  expect(training.getState().activeWorkout).toBeNull();
  expect((await db.pendingSyncRows(owner)).map((row) => row.syncId)).toEqual([rows[0].syncId]);
});

it('restores a draft as one new offline session and archives the source', async () => {
  const owner = await login('recover-atomic@example.com');
  const draft = {
    clientId: 'source-draft', revision: 0, status: 'DRAFT' as const, name: 'Borrador recuperado',
    startedAt: '2026-08-30T10:00:00.000Z', notes: null, sets: [], deletedSetClientIds: [],
  };
  await db.saveWorkout(owner, draft);

  await training.getState().recoverDraft(draft);

  expect(training.getState().activeWorkout).toMatchObject({ name: 'Borrador recuperado', status: 'ACTIVE' });
  expect(await db.loadRecoveredDrafts(owner)).toEqual([]);
  expect(await db.pendingSyncRows(owner)).toHaveLength(1);
});

it('rolls back optimistic recovery when the stored draft changed after being shown', async () => {
  const owner = await login('recover-changed@example.com');
  const draft = { clientId: 'changed-draft', revision: 0, status: 'DRAFT' as const,
    name: 'Borrador protegido', startedAt: '2026-08-30T10:00:00Z',
    notes: null, sets: [], deletedSetClientIds: [] };
  await db.saveWorkout(owner, draft);
  await db.saveWorkout(owner, { ...draft, notes: 'La nota más reciente' });
  offline = true;

  await expect(training.getState().recoverDraft(draft)).rejects.toThrow('El borrador cambió.');
  expect(training.getState()).toMatchObject({ activeWorkout: null, localSaveState: 'failed' });
  expect(training.getState().error).toContain('El borrador cambió.');
  expect(await db.loadActiveWorkout(owner)).toBeNull();
  expect(await db.pendingSyncRows(owner)).toEqual([]);
  expect(await db.loadRecoveredDrafts(owner)).toMatchObject([{ clientId: draft.clientId, notes: 'La nota más reciente' }]);
});

it('keeps a draft recoverable without a phantom session if its archival fails', async () => {
  const owner = await login('recover-failure@example.com');
  const draft = {
    clientId: 'source-draft-failure', revision: 0, status: 'DRAFT' as const, name: 'Borrador protegido',
    startedAt: '2026-08-30T10:00:00.000Z', notes: null, sets: [], deletedSetClientIds: [],
  };
  await db.saveWorkout(owner, draft);
  const connection = await db.getDatabase(owner);
  await connection.execAsync(`CREATE TRIGGER fail_draft_archive BEFORE UPDATE OF status ON workouts
    WHEN OLD.client_id = 'source-draft-failure' BEGIN SELECT RAISE(ABORT, 'archive failed'); END;`);
  try {
    await expect(training.getState().recoverDraft(draft)).rejects.toThrow('archive failed');
    expect(training.getState().activeWorkout).toBeNull();
    expect(training.getState().error).toContain('No se pudo recuperar el borrador.');
    expect(await db.loadRecoveredDrafts(owner)).toMatchObject([{ clientId: 'source-draft-failure', status: 'DRAFT' }]);
    expect(await db.pendingSyncRows(owner)).toEqual([]);
  } finally {
    await connection.execAsync('DROP TRIGGER fail_draft_archive;');
  }
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
