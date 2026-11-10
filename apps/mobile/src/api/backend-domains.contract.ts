// Explicit local integration only: the guarded runner supplies the synthetic
// database and compiled backend. No API responses or services are mocked.
import type { components } from '@evry/api-client';
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'synthetic-device',
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockSecure.set(key, value); },
  deleteItemAsync: async (key: string) => { mockSecure.delete(key); },
}));

const { createRequire } = jest.requireActual('node:module');
const { resolve } = jest.requireActual('node:path');
const { randomUUID } = jest.requireActual('node:crypto');
const backendRequire = createRequire(resolve(process.env.EVRY_BACKEND_ROOT!, 'package.json'));
const { Client } = backendRequire('pg');
const postgres = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
const userIds: string[] = [];
const password = 'synthetic-domain-contract-password';
let api: typeof import('./client');
let session: import('./client').MobileSession;
let userId: string;
let passwordHash: string;

beforeAll(async () => {
  // Install a coherent real HTTP implementation before client construction.
  const transport = jest.requireActual('node-fetch');
  global.Request = transport.Request;
  global.Response = transport.Response;
  global.Headers = transport.Headers;
  global.fetch = transport;
  api = jest.requireActual('./client');
  passwordHash = await backendRequire('bcrypt').hash(password, 10);
  await postgres.connect();
});

beforeEach(async () => {
  userId = randomUUID();
  const email = `domains-${userId}@example.test`;
  await postgres.query('INSERT INTO "User" (id,email,"passwordHash",name,"biologicalSex","updatedAt") VALUES ($1,$2,$3,$4,\'MALE\',NOW())',
    [userId, email, passwordHash, 'Synthetic domain contract']);
  userIds.push(userId);
  await api.loginMobile(email, password);
  expect((await api.currentUserWithRefresh()).id).toBe(userId);
  session = api.captureMobileSession();
});

afterAll(async () => {
  try {
    // Cascade only the exact users created by this suite, never reset tables.
    await postgres.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [userIds]);
  } finally { await postgres.end(); }
});

it('persists one daily readiness row across concurrent upserts and preserves explicit null answers', async () => {
  const empty = await api.withMobileAuth(client => client.GET('/readiness/latest'), session);
  expect(empty.response.status).toBe(200);
  expect(empty.data).toBeNull();
  const checkin = (body: components['schemas']['ReadinessInput']) =>
    api.withMobileAuth(client => client.POST('/readiness/checkin', { body }), session);
  const optimal = { sleepHrs: 8, stress: 1, soreness: 1, motivation: 5 };
  const concurrent = await Promise.all([checkin(optimal), checkin(optimal)]);
  for (const response of concurrent) {
    expect(response.response.status).toBe(201);
    expect(response.data).toMatchObject({ userId, ...optimal, score: 100 });
  }
  expect(concurrent[0].data!.id).toBe(concurrent[1].data!.id);
  const cleared = await checkin({ sleepHrs: null, stress: null, soreness: null, motivation: null });
  expect(cleared.response.status).toBe(201);
  expect(cleared.data).toMatchObject({ id: concurrent[0].data!.id, sleepHrs: null, stress: null, soreness: null, motivation: null, score: 70 });
  const latest = await api.withMobileAuth(client => client.GET('/readiness/latest'), session);
  expect(latest.data).toEqual(cleared.data);
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  expect((await postgres.query('SELECT "civilDate"::text AS day,"sleepHrs",stress,soreness,motivation,score FROM "Readiness" WHERE "userId"=$1', [userId])).rows)
    .toEqual([{ day: today, sleepHrs: null, stress: null, soreness: null, motivation: null, score: 70 }]);
});

it('requires voluntary cycle opt-in, moves civil dates across months without duplication and deletes the owned entry', async () => {
  const body = { date: '2020-08-31', flow: 'LIGHT' as const, symptoms: ['Fatiga'], energy: null, mood: 4, notes: 'Synthetic note', isPeriodStart: true };
  const denied = await api.withMobileAuth(client => client.POST('/cycle/entries', { body }), session);
  expect(denied.response.status).toBe(400);
  expect(denied.error).toMatchObject({ retryable: false });
  expect((await postgres.query('SELECT id FROM "CycleEntry" WHERE "userId"=$1', [userId])).rows).toEqual([]);
  const optIn = await api.withMobileAuth(client => client.PATCH('/users/me', { body: { trackCycle: true } }), session);
  expect(optIn.data).toMatchObject({ biologicalSex: 'MALE', trackCycle: true });
  const created = await api.withMobileAuth(client => client.POST('/cycle/entries', { body }), session);
  expect(created.response.status).toBe(201);
  expect(created.data).toMatchObject({ userId, date: '2020-08-31T00:00:00.000Z', energy: null, mood: 4 });
  const moved = await api.withMobileAuth(client => client.POST('/cycle/entries', {
    body: { ...body, previousDate: '2020-08-31', date: '2020-09-01' },
  }), session);
  expect(moved.response.status).toBe(201);
  expect(moved.data).toMatchObject({ id: created.data!.id, date: '2020-09-01T00:00:00.000Z' });
  const occupied = await api.withMobileAuth(client => client.POST('/cycle/entries', { body: { ...body, date: '2020-09-02' } }), session);
  expect(occupied.response.status).toBe(201);
  const conflict = await api.withMobileAuth(client => client.POST('/cycle/entries', {
    body: { ...body, previousDate: '2020-09-01', date: '2020-09-02', notes: 'Must not overwrite' },
  }), session);
  expect(conflict.response.status).toBe(409);
  expect(conflict.error).toMatchObject({ retryable: false });
  expect(typeof conflict.error?.requestId).toBe('string');
  const future = await api.withMobileAuth(client => client.POST('/cycle/entries', { body: { ...body, date: '9999-12-31' } }), session);
  expect(future.response.status).toBe(400);
  const invalidRange = await api.withMobileAuth(client => client.GET('/cycle/entries', {
    params: { query: { from: '2020-02-30', to: '2020-09-02' } },
  }), session);
  expect(invalidRange.response.status).toBe(400);
  const invertedRange = await api.withMobileAuth(client => client.GET('/cycle/entries', {
    params: { query: { from: '2020-09-02', to: '2020-09-01' } },
  }), session);
  expect(invertedRange.response.status).toBe(400);
  expect((await postgres.query('SELECT id,date::text AS day,notes FROM "CycleEntry" WHERE "userId"=$1 ORDER BY date', [userId])).rows)
    .toEqual([{ id: created.data!.id, day: '2020-09-01', notes: 'Synthetic note' }, { id: occupied.data!.id, day: '2020-09-02', notes: 'Synthetic note' }]);
  const deleted = await api.withMobileAuth(client => client.DELETE('/cycle/entries/{id}', { params: { path: { id: created.data!.id } } }), session);
  expect(deleted.response.status).toBe(200);
  const remaining = await api.withMobileAuth(client => client.GET('/cycle/entries'), session);
  expect(remaining.data?.map(entry => entry.id)).toEqual([occupied.data!.id]);
  const repeated = await api.withMobileAuth(client => client.DELETE('/cycle/entries/{id}', { params: { path: { id: created.data!.id } } }), session);
  expect(repeated.response.status).toBe(404);
  expect((await postgres.query('SELECT id FROM "CycleEntry" WHERE "userId"=$1', [userId])).rows)
    .toEqual([{ id: occupied.data!.id }]);
});
