// Explicit local cross-repository gate. Not a mocked API contract test and not
// physical-device acceptance. Run only through test:mobile:backend's DB guard.
import type { MobileSession, SyncWorkoutInput } from '../api/client';

type NativeStorage = { sqlite: ReturnType<typeof import('../testing/sqlite-native')['createSQLiteBridge']>; secure: Map<string, string> };
let mockStorage: NativeStorage;
let mockOnline = false;
let loseAcknowledgement = false;
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (name: string) => mockStorage.sqlite.openDatabaseAsync(name) }));
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device',
  getItemAsync: async (key: string) => mockStorage.secure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockStorage.secure.set(key, value); },
  deleteItemAsync: async (key: string) => { mockStorage.secure.delete(key); },
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: {
  fetch: async () => ({ isConnected: mockOnline, isInternetReachable: mockOnline }),
} }));

const { createRequire } = jest.requireActual('node:module');
const { resolve } = jest.requireActual('node:path');
const backendRequire = createRequire(resolve(process.env.EVRY_BACKEND_ROOT!, 'package.json'));
const { Client } = backendRequire('pg');
const postgres = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
const { randomUUID } = jest.requireActual('node:crypto');
const prefix = `native-${randomUUID().slice(0, 8)}`;
const password = 'synthetic-contract-password';
const userIds: string[] = [];
const exerciseIds: string[] = [];
let passwordHash: string;
let email: string;
let exerciseId: string;
let userId: string;

function newStorage(): NativeStorage {
  return { sqlite: jest.requireActual('../testing/sqlite-native').createSQLiteBridge(), secure: new Map() };
}

function openDevice(storage = newStorage()) {
  mockStorage = storage;
  let api!: typeof import('../api/client');
  let db!: typeof import('../db/database');
  let engine!: typeof import('./sync-engine');
  let training!: typeof import('../training/training-store')['useTrainingStore'];
  jest.isolateModules(() => {
    api = jest.requireActual('../api/client');
    db = jest.requireActual('../db/database');
    engine = jest.requireActual('./sync-engine');
    training = jest.requireActual('../training/training-store').useTrainingStore;
  });
  return { api, db, engine, training, storage };
}
type Device = ReturnType<typeof openDevice>;
async function login(device: Device): Promise<MobileSession> {
  mockStorage = device.storage;
  mockOnline = true;
  await device.api.loginMobile(email, password);
  expect((await device.api.currentUserWithRefresh()).id).toBe(userId);
  const owner = device.api.captureMobileSession();
  await device.training.getState().initialize(owner);
  mockOnline = false;
  return owner;
}
async function prepareWorkout(device: Device, owner: MobileSession) {
  await device.training.getState().startWorkout('Offline contract');
  await device.training.getState().addSet(exerciseId);
  const setId = device.training.getState().activeWorkout!.sets[0].clientId;
  await device.training.getState().updateSet(setId, { weightKg: 40, reps: 8 });
  await device.engine.syncPendingWorkouts(owner); // Drain offline schedules before reconnection.
  return setId;
}

beforeAll(async () => {
  // All four implementations belong to the same actual Node HTTP adapter.
  // Replaces only native fetch, never generated client/auth/API responses.
  const transport = jest.requireActual('node-fetch');
  global.Request = transport.Request;
  global.Response = transport.Response;
  global.Headers = transport.Headers;
  global.fetch = async (input, init) => {
    if (!mockOnline) throw new TypeError('Synthetic offline connection');
    const response = await transport(input, init);
    if (loseAcknowledgement && response.url.endsWith('/sync/workouts') && response.ok) {
      loseAcknowledgement = false;
      throw new TypeError('Synthetic lost acknowledgement after server commit');
    }
    return response;
  };
  passwordHash = await backendRequire('bcrypt').hash(password, 10);
  await postgres.connect();
});
beforeEach(async () => {
  loseAcknowledgement = false;
  mockOnline = false;
  email = `${prefix}-${randomUUID()}@example.test`;
  userId = randomUUID();
  await postgres.query('INSERT INTO "User" (id,email,"passwordHash",name,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
    [userId, email, passwordHash, 'Synthetic native contract']);
  userIds.push(userId);
  exerciseId = randomUUID();
  await postgres.query('INSERT INTO "Exercise" (id,name,"muscleGroup",equipment,"isCustom","ownerId") VALUES ($1,$2,\'CORE\',\'BODYWEIGHT\',true,$3)',
    [exerciseId, `${prefix} exercise`, userId]);
  exerciseIds.push(exerciseId);
});
afterAll(async () => {
  try {
    // Exact IDs created by this suite only. Never reset/drop/truncate databases.
    await postgres.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [userIds]);
    await postgres.query('DELETE FROM "Exercise" WHERE id = ANY($1::text[])', [exerciseIds]);
  } finally { await postgres.end(); }
});

it('completes offline after module reload and rotates credentials before real synchronization', async () => {
  const first = openDevice();
  const owner = await login(first);
  const oldRefresh = first.storage.secure.get('evry.mobile.refresh-token');
  const setId = await prepareWorkout(first, owner);
  const restarted = openDevice(first.storage);
  expect((await restarted.api.restoreCachedUser())?.id).toBe(userId);
  const resumedOwner = restarted.api.captureMobileSession();
  await restarted.training.getState().initialize(resumedOwner);
  expect(restarted.training.getState().activeWorkout?.sets[0]).toMatchObject({ clientId: setId, weightKg: 40, reps: 8 });
  await restarted.training.getState().updateSet(setId, { reps: 9 });
  await restarted.training.getState().finishWorkout();
  await restarted.engine.syncPendingWorkouts(resumedOwner);
  expect((await postgres.query('SELECT id FROM "Workout" WHERE "userId"=$1', [userId])).rows).toEqual([]);
  expect(await restarted.db.pendingSyncRows(resumedOwner)).toHaveLength(1);
  mockOnline = true;
  await restarted.engine.syncPendingWorkouts(resumedOwner);
  expect(await restarted.db.pendingSyncRows(resumedOwner)).toEqual([]);
  expect(first.storage.secure.get('evry.mobile.refresh-token')).not.toBe(oldRefresh);
  expect((await postgres.query('SELECT COUNT(*)::int AS count FROM "RefreshToken" WHERE "userId"=$1 AND "revokedAt" IS NULL', [userId])).rows)
    .toEqual([{ count: 1 }]);
  expect((await postgres.query('SELECT COUNT(*)::int AS count FROM "RefreshToken" WHERE "userId"=$1 AND "revokedAt" IS NOT NULL', [userId])).rows)
    .toEqual([{ count: 1 }]);
  expect((await postgres.query('SELECT status,revision FROM "Workout" WHERE "userId"=$1', [userId])).rows)
    .toEqual([{ status: 'COMPLETED', revision: 1 }]);
  expect((await postgres.query('SELECT s."clientId",s.reps,s."weightKg" FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [userId])).rows)
    .toEqual([{ clientId: setId, reps: 9, weightKg: 40 }]);
  expect(await restarted.db.currentSyncState(resumedOwner)).toBe('synced');
});

it('replays a lost acknowledgement without duplicate source data or statistics', async () => {
  const device = openDevice();
  const owner = await login(device);
  await prepareWorkout(device, owner);
  await device.training.getState().finishWorkout();
  await device.engine.syncPendingWorkouts(owner);
  const [queued] = await device.db.pendingSyncRows(owner);
  const batch = JSON.parse(queued.payload) as SyncWorkoutInput;
  mockOnline = true;
  loseAcknowledgement = true;
  await device.engine.syncPendingWorkouts(owner);
  expect((await postgres.query('SELECT id FROM "Workout" WHERE "userId"=$1', [userId])).rows).toHaveLength(1);
  expect(await device.db.pendingSyncRows(owner)).toMatchObject([{ syncId: queued.syncId, attempts: 1 }]);
  await device.engine.syncPendingWorkouts(owner);
  expect(await device.db.pendingSyncRows(owner)).toEqual([]);
  const replay = await device.api.syncWorkoutWithRefresh(batch, owner);
  expect(replay.status).toBe(201);
  expect(replay.data?.revision).toBe(1);
  expect((await postgres.query('SELECT id FROM "Workout" WHERE "userId"=$1', [userId])).rows).toHaveLength(1);
  expect((await postgres.query('SELECT s.id FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [userId])).rows).toHaveLength(1);
  const stats = await postgres.query('SELECT "sessionsCount","bestWeight","bestReps" FROM "ExerciseStat" WHERE "userId"=$1 AND "exerciseId"=$2', [userId, exerciseId]);
  expect(stats.rows).toEqual([{ sessionsCount: 1, bestWeight: 40, bestReps: 8 }]);
  expect(await device.db.currentSyncState(owner)).toBe('synced');
});

it('keeps both versions for explicit review when another device wins the revision', async () => {
  const first = openDevice();
  const firstOwner = await login(first);
  const setId = await prepareWorkout(first, firstOwner);
  mockOnline = true;
  await first.engine.syncPendingWorkouts(firstOwner);
  const canonical = await first.db.loadActiveWorkout(firstOwner);
  expect(canonical?.revision).toBe(1);
  const second = openDevice();
  const secondOwner = await login(second);
  await second.db.saveWorkout(secondOwner, canonical!);
  await second.training.getState().initialize(secondOwner);
  await second.training.getState().updateSet(setId, { reps: 10 });
  await second.engine.syncPendingWorkouts(secondOwner);
  mockOnline = true;
  await second.engine.syncPendingWorkouts(secondOwner);
  mockStorage = first.storage;
  mockOnline = false;
  await first.training.getState().initialize(firstOwner);
  await first.training.getState().updateSet(setId, { reps: 12 });
  await first.engine.syncPendingWorkouts(firstOwner);
  mockOnline = true;
  await first.engine.syncPendingWorkouts(firstOwner);
  expect(await first.db.currentSyncState(firstOwner)).toBe('requires_review');
  expect((await first.db.loadActiveWorkout(firstOwner))?.sets[0].reps).toBe(12);
  expect(await first.db.syncReviews(firstOwner)).toMatchObject([{
    errorCode: 'REVISION_CONFLICT', serverVersion: { revision: 2, sets: [{ reps: 10 }] },
  }]);
  expect((await postgres.query('SELECT s.reps FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [userId])).rows).toEqual([{ reps: 10 }]);
  expect((await postgres.query('SELECT id FROM "Workout" WHERE "userId"=$1 AND status=\'ACTIVE\'', [userId])).rows).toHaveLength(1);
});

it('preserves an unrelated local session as a recovered draft instead of merging another active server session', async () => {
  const device = openDevice();
  const owner = await login(device);
  await prepareWorkout(device, owner);
  const localId = device.training.getState().activeWorkout!.clientId;
  mockOnline = true;
  const serverId = randomUUID();
  const server = await device.api.syncWorkoutWithRefresh({
    clientId: serverId, syncId: randomUUID(), baseRevision: 0, name: 'Different server session',
    startedAt: new Date().toISOString(), status: 'ACTIVE', sets: [], deletedSetClientIds: [],
  }, owner);
  expect(server.status).toBe(201);
  await device.engine.syncPendingWorkouts(owner);
  expect(await device.db.currentSyncState(owner)).toBe('requires_review');
  expect(await device.db.syncReviews(owner)).toMatchObject([{
    workoutClientId: localId, errorCode: 'ACTIVE_WORKOUT_CONFLICT',
    serverVersion: { clientId: serverId, name: 'Different server session', sets: [] },
  }]);
  await device.db.keepReviewAsDraft(owner, localId);
  expect(await device.db.loadActiveWorkout(owner)).toBeNull();
  expect(await device.db.loadRecoveredDrafts(owner)).toMatchObject([{
    clientId: localId, status: 'DRAFT', name: 'Offline contract (recuperado)',
    sets: [{ exerciseId, weightKg: 40, reps: 8 }],
  }]);
  expect(await device.db.pendingSyncRows(owner)).toEqual([]);
  expect((await postgres.query('SELECT "clientId",name FROM "Workout" WHERE "userId"=$1', [userId])).rows)
    .toEqual([{ clientId: serverId, name: 'Different server session' }]);
  expect((await postgres.query('SELECT s.id FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [userId])).rows)
    .toEqual([]);
});

