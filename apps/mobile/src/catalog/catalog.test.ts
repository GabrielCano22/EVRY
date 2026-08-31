import type * as Api from '../api/client';
import type * as Database from '../db/database';
import type * as Catalog from './catalog';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
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

let api: typeof Api;
let db: typeof Database;
let catalog: typeof Catalog;
let session: Api.MobileSession;
let http: jest.Mock<Promise<Response>, [Request]>;
const originalFetch = globalThis.fetch;
const exercise: Catalog.Exercise = {
  id: 'exercise-1', sourceId: null, name: 'Sentadilla', muscleGroup: 'QUADS', equipment: 'BARBELL',
  category: null, imagePath: 'images/1.jpg', gifPath: 'videos/1.gif', target: 'Cuádriceps',
  bodyPart: 'Piernas', secondaryMuscles: [], equipmentLabel: 'Barra', isCustom: false,
  ownerId: null, isCompound: true, tags: [], description: null, mediaId: null, attribution: null,
  imageUrl: null, gifUrl: null,
};
const routine: Catalog.Routine = {
  id: 'routine-1', userId: 'test-user', name: 'Piernas', dayOfWeek: null, notes: null,
  createdAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-30T10:00:00.000Z', exercises: [],
};
const currentUser: Api.CurrentUser = {
  id: 'test-user', name: 'Test', email: 'test@example.com', biologicalSex: 'PREFER_NOT_SAY',
  birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5,
  createdAt: '2026-08-30T10:00:00.000Z',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(async () => {
  http = jest.fn(async (request: Request) => request.url.endsWith('/login')
    ? json({ accessToken: 'access-test', refreshToken: 'refresh-test' })
    : json(currentUser));
  globalThis.fetch = http as typeof fetch;
  jest.isolateModules(() => {
    api = jest.requireActual('../api/client');
    db = jest.requireActual('../db/database');
    catalog = jest.requireActual('./catalog');
  });
  await api.loginMobile('test@example.com', 'test-password');
  await api.currentUserWithRefresh();
  session = api.captureMobileSession();
  http.mockClear();
});
afterEach(() => { globalThis.fetch = originalFetch; });

it('uses the backend q/page contract and returns pagination metadata', async () => {
  let query = '';
  http.mockImplementation(async (request) => {
    query = new URL(request.url).search;
    return json({ items: [exercise], page: 2, limit: 30, total: 31, hasMore: false });
  });
  const result = await catalog.loadExercises(session, { search: ' Sentadilla ', page: 2 });
  const params = new URLSearchParams(query);
  expect(Object.fromEntries(params.entries())).toEqual({ q: 'Sentadilla', page: '2', limit: '30' });
  expect(result).toMatchObject({ items: [exercise], source: 'server', page: 2, total: 31, hasMore: false });
});

it('does not turn a network failure without a cache into an empty catalog', async () => {
  http.mockRejectedValue(new TypeError('Network request failed'));
  await expect(catalog.loadExercises(session)).rejects.toMatchObject({ code: 'OFFLINE_CACHE_MISS' });
});

it('does not hide a validation error behind cached exercises', async () => {
  await db.cacheEntities(session, 'exercise_cache', [exercise]);
  http.mockResolvedValue(json({ code: 'VALIDATION_ERROR', message: 'Invalid query', retryable: false, requestId: 'request-1' }, 400));
  await expect(catalog.loadExercises(session)).rejects.toMatchObject({ status: 400, message: 'Invalid query' });
});

it('preserves cancellation instead of returning cached results for an obsolete query', async () => {
  await db.cacheEntities(session, 'exercise_cache', [exercise]);
  const aborted = Object.assign(new Error('Cancelled'), { name: 'AbortError' });
  http.mockRejectedValue(aborted);
  await expect(catalog.loadExercises(session)).rejects.toBe(aborted);
});

it('returns an explicitly stale and bounded local page when the network fails', async () => {
  await db.cacheEntities(session, 'exercise_cache', Array.from({ length: 32 }, (_, index) => ({ ...exercise, id: `exercise-${index}`, name: `Sentadilla ${String(index).padStart(2, '0')}` })));
  http.mockRejectedValue(new TypeError('Network request failed'));
  const result = await catalog.loadExercises(session, { search: 'CUÁDRICEPS', page: 2 });
  expect(result).toMatchObject({ source: 'cache', stale: true, page: 2, total: 32, hasMore: false });
  expect(result.items.map((item) => item.name)).toEqual(['Sentadilla 30', 'Sentadilla 31']);
  expect(result.notice).toMatch(/copia local/i);
});

it('replaces a deleted routine cache with the authoritative empty response, including offline', async () => {
  await db.cacheEntities(session, 'routine_cache', [routine]);
  http.mockResolvedValue(json([]));
  expect(await catalog.loadRoutines(session)).toMatchObject({ source: 'server', items: [] });
  http.mockRejectedValue(new TypeError('Network request failed'));
  expect(await catalog.loadRoutines(session)).toMatchObject({ source: 'cache', stale: true, items: [] });
});

it('removes routines absent from the latest full server snapshot', async () => {
  await db.cacheEntities(session, 'routine_cache', [routine, { ...routine, id: 'deleted' }]);
  http.mockResolvedValue(json([routine]));
  await catalog.loadRoutines(session);
  http.mockRejectedValue(new TypeError('Network request failed'));
  expect((await catalog.loadRoutines(session)).items.map((item) => item.id)).toEqual(['routine-1']);
});

it('marks fallback data as stale during a temporary server outage', async () => {
  await db.cacheEntities(session, 'exercise_cache', [exercise]);
  http.mockResolvedValue(json({ code: 'UNAVAILABLE', message: 'Server waking', retryable: true, requestId: 'request-2' }, 503));
  expect(await catalog.loadExercises(session)).toMatchObject({ source: 'cache', stale: true, items: [exercise] });
});

it('reports cache write failures instead of replacing a valid response with stale data', async () => {
  const connection = await db.getDatabase(session);
  await connection.execAsync("CREATE TRIGGER reject_cache BEFORE INSERT ON exercise_cache BEGIN SELECT RAISE(ABORT, 'cache storage failed'); END;");
  http.mockResolvedValue(json({ items: [exercise], page: 1, limit: 30, total: 1, hasMore: false }));
  await expect(catalog.loadExercises(session)).rejects.toThrow('cache storage failed');
});
