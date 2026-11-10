import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from '../training/training-store';
import { getDatabase, markSyncFailure, pendingSyncRows } from '../db/database';
import { captureMobileSession, type CurrentUser, type SyncWorkoutInput } from '../api/client';
import { SyncCoordinator } from './SyncCoordinator';

// Keep the coordinator, stores, generated HTTP client, engine and transaction
// SQL real. Replace only native notifications/storage/crypto and external HTTP.
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    deleteItemAsync: async (key: string) => { values.delete(key); } };
});
jest.mock('@evry/api-client', () => {
  const actual = jest.requireActual<typeof import('@evry/api-client')>('@evry/api-client');
  return { ...actual, createEvryApiClient: (base: string, token: import('@evry/api-client').AccessTokenProvider) =>
    actual.createEvryApiClient(base, token, { fetch: request => globalThis.fetch(request) }) };
});
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true,
  NetInfoStateType: jest.requireActual('@react-native-community/netinfo/src/internal/types').NetInfoStateType,
  default: {
  fetch: async () => networkState(),
  addEventListener: (listener: (state: NetInfoState) => void) => {
    mockNetworkListeners.add(listener);
    return () => { mockNetworkListeners.delete(listener); };
  },
} }));

const mockNetworkListeners = new Set<(state: NetInfoState) => void>();
const appListeners = new Set<(state: AppStateStatus) => void>();
let mockConnected = false;
let mockInternetReachable: boolean | null = null;
const networkState = (): NetInfoState => mockConnected
  ? { type: NetInfoStateType.other, isConnected: true,
    isInternetReachable: mockInternetReachable, details: { isConnectionExpensive: false } }
  : { type: NetInfoStateType.none, isConnected: false, isInternetReachable: false, details: null };
const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});
const profile = (id: string): CurrentUser => ({ id, email: `${id}@example.test`, name: id,
  biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-10-10T12:00:00.000Z' });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
let gate: ReturnType<typeof deferred> | null;
let requests: Request[];
let uploads: SyncWorkoutInput[];
let account: string;
let failProfiles: boolean;
let failUploads: boolean;
let generation = 0;
const originalFetch = globalThis.fetch;
const profileRequests = () => requests.filter(request => request.url.endsWith('/users/me'));

beforeEach(async () => {
  account = `coordinator-${++generation}`;
  gate = null;
  requests = [];
  uploads = [];
  failProfiles = false;
  failUploads = false;
  mockConnected = false;
  mockInternetReachable = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    appListeners.add(callback);
    return { remove: () => { appListeners.delete(callback); } };
  });
  globalThis.fetch = (async (request: Request) => {
    requests.push(request);
    if (request.url.endsWith('/auth/mobile/login')) {
      const { email } = await request.json();
      const id = email.split('@')[0];
      return json({ accessToken: id, refreshToken: `${id}-refresh` });
    }
    if (request.url.endsWith('/users/me')) {
      const id = request.headers.get('Authorization')!.replace('Bearer ', '');
      if (id === account && gate) await gate.promise;
      if (id === account && failProfiles) throw new TypeError('Synthetic connection failure');
      return json(profile(id));
    }
    if (request.url.endsWith('/auth/mobile/logout')) return json({});
    if (request.url.endsWith('/sync/workouts')) {
      if (failUploads) throw new TypeError('Synthetic sync transport failure');
      const body = await request.json() as SyncWorkoutInput;
      uploads.push(body);
      return json({ revision: 1, mapping: {
        workout: { clientId: body.clientId, serverId: 'synthetic-workout' }, sets: [],
      }, workout: { id: 'synthetic-workout', userId: account, name: body.name,
        startedAt: body.startedAt, endedAt: null, cancelledAt: null, status: 'ACTIVE',
        clientId: body.clientId, lastSyncId: body.syncId, revision: 1, cyclePhase: null,
        notes: null, routineId: null, createdAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z', sets: [], routine: null } });
    }
    throw new Error('Unexpected HTTP route');
  }) as typeof fetch;
  await useSessionStore.getState().login(`${account}@example.test`, 'synthetic-password');
  await useTrainingStore.getState().initialize(captureMobileSession());
  requests = [];
});

it('retries a pending upload after a temporary server failure without another network event', async () => {
  const interval = jest.spyOn(globalThis, 'setInterval');
  const previousState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  try {
    await useTrainingStore.getState().startWorkout('Pending server retry');
    mockConnected = true;
    failUploads = true;
    await render(<SyncCoordinator />);
    await waitFor(() => expect(profileRequests()).toHaveLength(1));
    await waitFor(() => expect(requests.filter(request => request.url.endsWith('/sync/workouts')).length).toBeGreaterThan(0));
    expect(useSessionStore.getState().offline).toBe(false);
    expect(useTrainingStore.getState().syncState).toBe('pending');
    await waitFor(() => expect(interval).toHaveBeenCalledWith(expect.any(Function), 30_000));
    const retry = interval.mock.calls.find(([, delay]) => delay === 30_000)?.[0];
    expect(typeof retry).toBe('function');
    failUploads = false;
    await act(async () => { (retry as () => void)(); });
    await waitFor(() => expect(useTrainingStore.getState().syncState).toBe('synced'));
    expect(uploads).toHaveLength(1);
  } finally {
    if (previousState) Object.defineProperty(AppState, 'currentState', previousState);
  }
});

it('does not start periodic retries for a synchronized online session', async () => {
  const interval = jest.spyOn(globalThis, 'setInterval');
  mockConnected = true;
  await render(<SyncCoordinator />);
  await waitFor(() => expect(profileRequests()).toHaveLength(1));
  expect(useSessionStore.getState().offline).toBe(false);
  expect(useTrainingStore.getState().syncState).toBe('synced');
  expect(interval.mock.calls.some(([, delay]) => delay === 30_000)).toBe(false);
});

it('retries a different pending workout while a conflict still requires review', async () => {
  const interval = jest.spyOn(globalThis, 'setInterval');
  const previousState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  try {
    const owner = captureMobileSession();
    await useTrainingStore.getState().startWorkout('Needs review');
    await useTrainingStore.getState().cancelWorkout();
    const review = (await pendingSyncRows(owner))[0];
    await markSyncFailure(owner, review.id, review.workoutClientId, 'requires_review', 'REVISION_CONFLICT');
    await useTrainingStore.getState().startWorkout('Independent pending workout');
    await useTrainingStore.getState().refreshSyncState();
    expect(useTrainingStore.getState().syncState).toBe('requires_review');
    mockConnected = false;
    failUploads = true;
    await render(<SyncCoordinator />);
    await waitFor(() => expect(profileRequests()).toHaveLength(1));
    mockConnected = true;
    await act(async () => { mockNetworkListeners.forEach(listener => listener(networkState())); });
    await waitFor(() => expect(requests.some(request => request.url.endsWith('/sync/workouts'))).toBe(true));
    await waitFor(() => expect(interval).toHaveBeenCalledWith(expect.any(Function), 30_000));
    const retry = interval.mock.calls.find(([, delay]) => delay === 30_000)?.[0];
    failUploads = false;
    await act(async () => { (retry as () => void)(); });
    await waitFor(() => expect(uploads).toHaveLength(1));
    expect(uploads[0].name).toBe('Independent pending workout');
    expect(useTrainingStore.getState().syncState).toBe('requires_review');
    await waitFor(async () => expect(await pendingSyncRows(owner)).toHaveLength(0));
    const requestsBefore = requests.length;
    await act(async () => { (retry as () => void)(); });
    expect(requests).toHaveLength(requestsBefore);
  } finally {
    if (previousState) Object.defineProperty(AppState, 'currentState', previousState);
  }
});
afterEach(async () => {
  await cleanup();
  await act(async () => {
    gate?.resolve();
    gate = null;
    await useSessionStore.getState().logout();
  });
  useTrainingStore.getState().reset();
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
  mockNetworkListeners.clear();
  appListeners.clear();
});

async function reconnectBurst() {
  await act(async () => {
    for (let event = 0; event < 5; event++) {
      mockNetworkListeners.forEach(listener => listener(networkState()));
      appListeners.forEach(listener => listener('active'));
    }
  });
}

it('uploads over a connected local network even when public internet is not validated', async () => {
  await useTrainingStore.getState().startWorkout('Local network session');
  const owner = captureMobileSession();
  const database = await getDatabase(owner);
  await render(<SyncCoordinator />);
  await waitFor(() => expect(profileRequests()).toHaveLength(1));
  expect(await database.getFirstAsync('SELECT COUNT(*) AS count FROM sync_queue')).toEqual({ count: 1 });

  mockConnected = true;
  mockInternetReachable = false;
  await act(async () => {
    mockNetworkListeners.forEach(listener => listener(networkState()));
  });

  await waitFor(() => expect(useTrainingStore.getState().syncState).toBe('synced'));
  expect(uploads).toHaveLength(1);
  expect(uploads[0].name).toBe('Local network session');
  expect(await database.getFirstAsync('SELECT COUNT(*) AS count FROM sync_queue')).toEqual({ count: 0 });
  expect(await database.getFirstAsync('SELECT server_id, revision, sync_state FROM workouts'))
    .toEqual({ server_id: 'synthetic-workout', revision: 1, sync_state: 'synced' });
});

it('serializes reconnect/foreground bursts and preserves the pending offline workout', async () => {
  await useTrainingStore.getState().startWorkout('Offline session');
  const owner = captureMobileSession();
  const database = await getDatabase(owner);
  expect(await database.getFirstAsync('SELECT COUNT(*) AS count FROM sync_queue')).toEqual({ count: 1 });
  mockConnected = true;
  gate = deferred();
  await render(<SyncCoordinator />);
  await waitFor(() => expect(profileRequests()).toHaveLength(1));
  await reconnectBurst();
  // Dropping the per-session flight launches eleven simultaneous profile GETs.
  expect(profileRequests()).toHaveLength(1);
  await act(async () => { gate!.resolve(); gate = null; });
  await waitFor(() => expect(useTrainingStore.getState().syncState).toBe('synced'));
  await waitFor(() => expect(profileRequests()).toHaveLength(2));
  expect(uploads).toHaveLength(1);
  expect(uploads[0].name).toBe('Offline session');
  expect(await database.getFirstAsync('SELECT COUNT(*) AS count FROM sync_queue')).toEqual({ count: 0 });
  expect(await database.getFirstAsync('SELECT server_id, revision, sync_state FROM workouts'))
    .toEqual({ server_id: 'synthetic-workout', revision: 1, sync_state: 'synced' });
});

it('does not let a blocked old account prevent the next account from synchronizing', async () => {
  mockConnected = true;
  gate = deferred();
  await render(<SyncCoordinator />);
  await waitFor(() => expect(profileRequests()).toHaveLength(1));
  await reconnectBurst();
  const next = `${account}-next`;
  await act(async () => {
    await useSessionStore.getState().login(`${next}@example.test`, 'synthetic-password');
    await useTrainingStore.getState().initialize(captureMobileSession());
  });
  await waitFor(() => expect(profileRequests().filter(request =>
    request.headers.get('Authorization') === `Bearer ${next}`)).toHaveLength(2));
  await act(async () => { gate!.resolve(); gate = null; });
  expect(useSessionStore.getState().user?.id).toBe(next);
  expect(useTrainingStore.getState().session?.userId).toBe(next);
  expect(profileRequests().filter(request =>
    request.headers.get('Authorization') === `Bearer ${account}`)).toHaveLength(1);
  expect(uploads).toHaveLength(0);
});

it('releases a failed flight so later reconnects can recover and refresh again', async () => {
  mockConnected = true;
  failProfiles = true;
  await render(<SyncCoordinator />);
  await waitFor(() => expect(useSessionStore.getState().offline).toBe(true));
  expect(profileRequests()).toHaveLength(1);
  await act(async () => {
    failProfiles = false;
    mockNetworkListeners.forEach(listener => listener(networkState()));
  });
  await waitFor(() => expect(useSessionStore.getState().offline).toBe(false));
  expect(useSessionStore.getState().error).toBeNull();
  expect(profileRequests()).toHaveLength(2);
  await act(async () => {
    appListeners.forEach(listener => listener('active'));
  });
  await waitFor(() => expect(profileRequests()).toHaveLength(3));
  expect(useSessionStore.getState().user?.id).toBe(account);
});

it('retries an offline session in the foreground even without a network change event', async () => {
  const interval = jest.spyOn(globalThis, 'setInterval');
  const clear = jest.spyOn(globalThis, 'clearInterval');
  const previousState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  try {
    await useTrainingStore.getState().startWorkout('Offline retry workout');
    mockConnected = false;
    failProfiles = true;
    await render(<SyncCoordinator />);
    await waitFor(() => expect(useSessionStore.getState().offline).toBe(true));
    await waitFor(() => expect(interval).toHaveBeenCalledWith(expect.any(Function), 30_000));
    const retryIndex = interval.mock.calls.findIndex(([, delay]) => delay === 30_000);
    const retry = interval.mock.calls[retryIndex]?.[0];
    const retryTimer = interval.mock.results[retryIndex]?.value;
    expect(typeof retry).toBe('function');
    failProfiles = false;
    mockConnected = true;
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
    await act(async () => { (retry as () => void)(); });
    expect(profileRequests()).toHaveLength(1);
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    await act(async () => { (retry as () => void)(); });
    await waitFor(() => expect(useSessionStore.getState().offline).toBe(false));
    await waitFor(() => expect(useTrainingStore.getState().syncState).toBe('synced'));
    await waitFor(() => expect(clear).toHaveBeenCalledWith(retryTimer));
    expect(profileRequests()).toHaveLength(2);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].name).toBe('Offline retry workout');
  } finally {
    if (previousState) Object.defineProperty(AppState, 'currentState', previousState);
  }
});
