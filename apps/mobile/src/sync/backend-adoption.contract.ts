// Separate synthetic suite: real shared login quotas remain enabled and unchanged.
import type { MobileSession } from '../api/client';

const mockSecure = new Map<string, string>();
let mockOnline = false;
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device',
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockSecure.set(key, value); },
  deleteItemAsync: async (key: string) => { mockSecure.delete(key); },
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
const { randomUUID } = jest.requireActual('node:crypto');
const backendRequire = createRequire(resolve(process.env.EVRY_BACKEND_ROOT!, 'package.json'));
const { Client } = backendRequire('pg');
const postgres = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
const userId = randomUUID();
const exerciseId = randomUUID();
let api: typeof import('../api/client');
let db: typeof import('../db/database');
let engine: typeof import('./sync-engine');
let training: typeof import('../training/training-store')['useTrainingStore'];
let owner: MobileSession;

beforeAll(async () => {
  const transport = jest.requireActual('node-fetch');
  global.Request = transport.Request;
  global.Response = transport.Response;
  global.Headers = transport.Headers;
  global.fetch = (input, init) => {
    if (!mockOnline) return Promise.reject(new TypeError('Synthetic offline connection'));
    return transport(input, init);
  };
  api = jest.requireActual('../api/client');
  db = jest.requireActual('../db/database');
  engine = jest.requireActual('./sync-engine');
  training = jest.requireActual('../training/training-store').useTrainingStore;
  const password = 'synthetic-adoption-contract-password';
  const email = `adoption-${userId}@example.test`;
  const hash = await backendRequire('bcrypt').hash(password, 10);
  await postgres.connect();
  await postgres.query('INSERT INTO "User" (id,email,"passwordHash",name,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
    [userId, email, hash, 'Synthetic adoption contract']);
  await postgres.query('INSERT INTO "Exercise" (id,name,"muscleGroup",equipment,"isCustom","ownerId") VALUES ($1,$2,\'CORE\',\'BODYWEIGHT\',true,$3)',
    [exerciseId, 'Synthetic adoption exercise', userId]);
  mockOnline = true;
  await api.loginMobile(email, password);
  expect((await api.currentUserWithRefresh()).id).toBe(userId);
  owner = api.captureMobileSession();
  await training.getState().initialize(owner);
  mockOnline = false;
});

afterAll(async () => {
  try {
    await postgres.query('DELETE FROM "User" WHERE id=$1', [userId]);
    await postgres.query('DELETE FROM "Exercise" WHERE id=$1', [exerciseId]);
  } finally { await postgres.end(); }
});

it('continues a REST-created web workout through actual identity adoption, local editing and completion', async () => {
  await training.getState().startWorkout('Offline contract');
  await training.getState().addSet(exerciseId);
  await engine.syncPendingWorkouts(owner);
  const rejectedLocalId = training.getState().activeWorkout!.clientId;
  mockOnline = true;
  const web = await api.withMobileAuth((client) => client.POST('/workouts', {
    body: { name: 'Web original' },
  }), owner);
  expect(web.response.status).toBe(201);
  const webId = web.data!.id;
  const webSet = await api.withMobileAuth((client) => client.POST('/workouts/{id}/sets', {
    params: { path: { id: webId } },
    body: { clientMutationId: randomUUID(), exerciseId, order: 0, reps: 5, weightKg: 40 },
  }), owner);
  expect(webSet.response.status).toBe(201);
  await engine.syncPendingWorkouts(owner);
  const [review] = await db.syncReviews(owner);
  expect(review).toMatchObject({
    workoutClientId: rejectedLocalId, errorCode: 'ACTIVE_WORKOUT_CONFLICT',
    serverVersion: { id: webId, clientId: null, sets: [{ id: webSet.data!.id, clientId: null, reps: 5 }] },
  });

  await db.continueServerWorkout(owner, review, (server) => api.adoptWorkoutWithRefresh(server.id, owner));
  await training.getState().initialize(owner);
  const adopted = training.getState().activeWorkout!;
  expect(adopted.clientId).not.toBe(rejectedLocalId);
  expect(adopted.clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(adopted.sets).toMatchObject([{ exerciseId, reps: 5, weightKg: 40 }]);
  expect(await db.syncReviews(owner)).toEqual([]);
  mockOnline = false;
  await training.getState().updateSet(adopted.sets[0].clientId, { reps: 9 });
  await training.getState().finishWorkout();
  await engine.syncPendingWorkouts(owner);
  expect(await db.pendingSyncRows(owner)).toHaveLength(1);
  mockOnline = true;
  await engine.syncPendingWorkouts(owner);
  expect(await db.pendingSyncRows(owner)).toEqual([]);
  expect(await db.currentSyncState(owner)).toBe('synced');
  expect((await postgres.query('SELECT id,status FROM "Workout" WHERE "userId"=$1', [userId])).rows)
    .toEqual([{ id: webId, status: 'COMPLETED' }]);
  expect((await postgres.query('SELECT s.id,s.reps,s."weightKg" FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [userId])).rows)
    .toEqual([{ id: webSet.data!.id, reps: 9, weightKg: 40 }]);
  expect((await postgres.query('SELECT "sessionsCount","bestReps" FROM "ExerciseStat" WHERE "userId"=$1 AND "exerciseId"=$2', [userId, exerciseId])).rows)
    .toEqual([{ sessionsCount: 1, bestReps: 9 }]);
});
