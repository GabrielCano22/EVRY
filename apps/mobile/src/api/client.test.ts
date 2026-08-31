import * as SecureStore from 'expo-secure-store';
import type * as MobileClient from './client';
import type { useSessionStore } from '../auth/session-store';

// Keep the generated HTTP client real; replace only native secure storage and HTTP.
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { values.delete(key); }),
  };
});

const refreshKey = 'evry.mobile.refresh-token';
const profileKey = 'evry.mobile.profile-v1';
const originKey = 'evry.mobile.token-origin';
const originalFetch = globalThis.fetch;
let client: typeof MobileClient;
let sessionStore: typeof useSessionStore;
let http: jest.Mock<Promise<Response>, [Request]>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const tokens = (account: string) => ({ accessToken: `access-${account}`, refreshToken: `refresh-${account}` });

beforeEach(async () => {
  await SecureStore.deleteItemAsync(refreshKey);
  await SecureStore.deleteItemAsync(profileKey);
  http = jest.fn();
  globalThis.fetch = http as typeof fetch;
  // Each test represents a fresh app process, with its own in-memory auth state.
  jest.isolateModules(() => {
    client = jest.requireActual('./client');
    sessionStore = jest.requireActual('../auth/session-store').useSessionStore;
  });
  await SecureStore.setItemAsync(originKey, client.API_BASE_URL);
});

afterEach(() => { globalThis.fetch = originalFetch; });

it('rotates one refresh token only once when multiple requests need renewal', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  const started = deferred<void>();
  const response = deferred<Response>();
  const sentTokens: string[] = [];
  http.mockImplementation(async (request) => {
    sentTokens.push((await request.json()).refreshToken);
    started.resolve();
    return (await response.promise).clone();
  });
  const first = client.refreshMobileSession();
  const second = client.refreshMobileSession();
  await started.promise;
  response.resolve(json(tokens('rotated')));
  expect(await Promise.all([first, second])).toEqual([true, true]);
  expect(sentTokens).toEqual(['refresh-original']);
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-rotated');
});

it('does not restore a session when refresh completes after logout', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  const started = deferred<void>();
  const response = deferred<Response>();
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/refresh')) {
      started.resolve();
      return response.promise;
    }
    return json({ success: true });
  });
  const refresh = client.refreshMobileSession();
  await started.promise;
  await client.logoutMobile();
  response.resolve(json(tokens('late')));
  expect(await refresh).toBe(false);
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
});

it('keeps the newer login when a previous account login finishes late', async () => {
  const started = deferred<void>();
  const response = deferred<Response>();
  http.mockImplementation(async (request) => {
    if ((await request.json()).email === 'first@example.com') {
      started.resolve();
      return response.promise;
    }
    return json(tokens('second'));
  });
  const first = client.loginMobile('first@example.com', 'password-one').catch((error: unknown) => error);
  await started.promise;
  await client.loginMobile('second@example.com', 'password-two');
  response.resolve(json(tokens('first')));
  expect(await first).toMatchObject({ code: 'SESSION_CHANGED' });
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-second');
});

it('reuses the rotated access token for a late 401 instead of rotating twice', async () => {
  const lateUnauthorized = deferred<Response>();
  const secondStarted = deferred<void>();
  let originalRequests = 0;
  let refreshes = 0;
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) return json(tokens('original'));
    if (request.url.endsWith('/refresh')) {
      refreshes += 1;
      return json(tokens('rotated'));
    }
    if (request.headers.get('Authorization') === 'Bearer access-original') {
      originalRequests += 1;
      if (originalRequests === 2) {
        secondStarted.resolve();
        return lateUnauthorized.promise;
      }
      return json({ code: 'UNAUTHORIZED', message: 'Expired' }, 401);
    }
    return json({ id: 'user-original', email: 'original@example.com', name: 'Original' });
  });
  await client.loginMobile('original@example.com', 'password-one');
  const first = client.currentUserWithRefresh();
  const second = client.currentUserWithRefresh();
  await secondStarted.promise;
  expect(await first).toMatchObject({ id: 'user-original' });
  lateUnauthorized.resolve(json({ code: 'UNAUTHORIZED', message: 'Expired' }, 401));
  expect(await second).toMatchObject({ id: 'user-original' });
  expect(refreshes).toBe(1);
});

it('never retries an old workout with the credentials of the next account', async () => {
  const started = deferred<void>();
  const response = deferred<Response>();
  const workoutHeaders: (string | null)[] = [];
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) {
      return json(tokens((await request.json()).email === 'first@example.com' ? 'first' : 'second'));
    }
    if (request.url.endsWith('/refresh')) return json(tokens('second'));
    if (request.url.endsWith('/users/me')) return json({ id: 'user-first', email: 'first@example.com', name: 'First', trackCycle: false });
    workoutHeaders.push(request.headers.get('Authorization'));
    if (workoutHeaders.length === 1) {
      started.resolve();
      return response.promise;
    }
    return json({ revision: 1 });
  });
  await client.loginMobile('first@example.com', 'password-one');
  await client.currentUserWithRefresh();
  const sync = client.syncWorkoutWithRefresh({
    syncId: 'batch-a', clientId: 'workout-a', baseRevision: 0, status: 'ACTIVE',
    name: 'Private workout A', startedAt: '2026-08-30T10:00:00.000Z', sets: [], deletedSetClientIds: [],
  }, client.captureMobileSession()).catch((error: unknown) => error);
  await started.promise;
  await client.loginMobile('second@example.com', 'password-two');
  response.resolve(json({ code: 'UNAUTHORIZED', message: 'Expired' }, 401));
  expect(await sync).toMatchObject({ code: 'SESSION_CHANGED' });
  expect(workoutHeaders).toEqual(['Bearer access-first']);
});

it('clears local credentials before the logout endpoint completes, without clearing a later login', async () => {
  const started = deferred<void>();
  const response = deferred<Response>();
  const revoked: string[] = [];
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/logout')) {
      revoked.push((await request.json()).refreshToken);
      started.resolve();
      return response.promise;
    }
    return json(tokens('second'));
  });
  await SecureStore.setItemAsync(refreshKey, 'refresh-first');
  const logout = client.logoutMobile();
  await started.promise;
  const locallyCleared = await SecureStore.getItemAsync(refreshKey);
  await client.loginMobile('second@example.com', 'password-two');
  response.resolve(json({ success: true }));
  await logout;
  expect(locallyCleared).toBeNull();
  expect(revoked).toEqual(['refresh-first']);
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-second');
});

it('discards a consumed refresh token if its rotated replacement cannot be stored securely', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  http.mockResolvedValue(json(tokens('rotated')));
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain unavailable'));
  await expect(client.refreshMobileSession()).rejects.toThrow('keychain unavailable');
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
  expect(await client.refreshMobileSession()).toBe(false);
});

it('preserves resumable credentials on a temporary server error and exposes that error', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  http.mockResolvedValue(json({ code: 'UNAVAILABLE', message: 'Server waking', retryable: true }, 503));
  await expect(client.refreshMobileSession()).rejects.toMatchObject({ status: 503, message: 'Server waking' });
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-original');
});

it('does not let an obsolete initialization failure replace a newer authenticated user', async () => {
  const started = deferred<void>();
  const response = deferred<Response>();
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) return json(tokens('second'));
    if (!request.headers.has('Authorization')) {
      started.resolve();
      return response.promise;
    }
    return json({ id: 'user-second', email: 'second@example.com', name: 'Second' });
  });
  const initialize = sessionStore.getState().initialize();
  await started.promise;
  await sessionStore.getState().login('second@example.com', 'password-two');
  response.resolve(json({ code: 'UNAUTHORIZED', message: 'Expired' }, 401));
  await initialize;
  expect(sessionStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 'user-second' }, error: null });
});

it('keeps authentication errors in visible state without an unhandled rejected login action', async () => {
  http.mockResolvedValue(json({ code: 'UNAUTHORIZED', message: 'Credenciales incorrectas' }, 401));
  await expect(sessionStore.getState().login('invalid@example.com', 'invalid-password')).resolves.toBeUndefined();
  expect(sessionStore.getState()).toMatchObject({ status: 'anonymous', user: null, error: 'Credenciales incorrectas' });
});

it('serializes an in-flight keychain write before logout and the next account login', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  const started = deferred<void>();
  const finishWrite = deferred<void>();
  const write = jest.mocked(SecureStore.setItemAsync).getMockImplementation()!;
  jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(async (...args) => {
    started.resolve();
    await finishWrite.promise;
    return write(...args);
  });
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/refresh')) return json(tokens('rotated'));
    if (request.url.endsWith('/logout')) return json({ success: true });
    return json(tokens('second'));
  });
  const refresh = client.refreshMobileSession();
  await started.promise;
  const logout = client.logoutMobile();
  const login = client.loginMobile('second@example.com', 'password-two');
  finishWrite.resolve();
  expect(await refresh).toBe(false);
  await Promise.all([logout, login]);
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-second');
});

it('removes revoked credentials even if the server error code is not UNAUTHORIZED', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-revoked');
  http.mockResolvedValue(json({ code: 'REFRESH_REUSE_DETECTED', message: 'Family revoked' }, 401));
  expect(await client.refreshMobileSession()).toBe(false);
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
});

it('keeps secure credentials for retry after a transport failure', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-offline');
  http.mockRejectedValue(new TypeError('Network request failed'));
  await expect(client.refreshMobileSession()).rejects.toThrow('Network request failed');
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('refresh-offline');
});

it('does not restore the profile when its request completes after logout', async () => {
  const started = deferred<void>();
  const response = deferred<Response>();
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) return json(tokens('original'));
    if (request.url.endsWith('/logout')) return json({ success: true });
    return json({ id: 'user-original', email: 'original@example.com', name: 'Original' });
  });
  await sessionStore.getState().login('original@example.com', 'password-one');
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/logout')) return json({ success: true });
    started.resolve();
    return response.promise;
  });
  const profile = sessionStore.getState().refreshUser();
  await started.promise;
  await sessionStore.getState().logout();
  response.resolve(json({ id: 'user-original', email: 'original@example.com', name: 'Original' }));
  await profile;
  expect(sessionStore.getState()).toMatchObject({ status: 'anonymous', user: null, error: null });
});

it('still removes stored credentials if reading the refresh token during logout fails', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain read failed'));
  await expect(client.logoutMobile()).rejects.toThrow('keychain read failed');
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
});

it('shows a secure logout failure without rejecting the UI action', async () => {
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('No se pudieron borrar las credenciales locales.'));
  await expect(sessionStore.getState().logout()).resolves.toBeUndefined();
  expect(sessionStore.getState()).toMatchObject({
    status: 'anonymous', user: null, error: 'No se pudieron borrar las credenciales locales.',
  });
});

it('does not reuse a new access token indefinitely when the authenticated retry is also rejected', async () => {
  await SecureStore.setItemAsync(refreshKey, 'refresh-original');
  http.mockImplementation(async (request) => (
    request.url.endsWith('/refresh')
      ? json(tokens('rotated'))
      : json({ code: 'UNAUTHORIZED', message: 'Account disabled' }, 401)
  ));
  await expect(client.currentUserWithRefresh()).rejects.toMatchObject({ status: 401 });
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
  expect(await client.refreshMobileSession()).toBe(false);
});

it('removes a partially persisted login when native secure storage reports a write failure', async () => {
  const write = jest.mocked(SecureStore.setItemAsync).getMockImplementation()!;
  jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(async (...args) => {
    await write(...args);
    throw new Error('keychain write failed');
  });
  http.mockResolvedValue(json(tokens('original')));
  await expect(client.loginMobile('original@example.com', 'password-one')).rejects.toThrow('keychain write failed');
  expect(await SecureStore.getItemAsync(refreshKey)).toBeNull();
  expect(await client.refreshMobileSession()).toBe(false);
});

it('reopens an already validated account offline after a fresh app process', async () => {
  http.mockImplementation(async (request) => request.url.endsWith('/login') ? json(tokens('original')) : json({
    id: 'user-original', email: 'original@example.com', name: 'Original', trackCycle: true,
  }));
  await sessionStore.getState().login('original@example.com', 'password-one');
  http.mockRejectedValue(new TypeError('Network request failed'));
  jest.isolateModules(() => {
    client = jest.requireActual('./client');
    sessionStore = jest.requireActual('../auth/session-store').useSessionStore;
  });
  await sessionStore.getState().initialize();
  expect(sessionStore.getState()).toMatchObject({
    status: 'authenticated', offline: true, user: { id: 'user-original', trackCycle: true },
    session: { userId: 'user-original' },
  });
});

it('does not restore a logged-out account offline after restarting the app', async () => {
  http.mockImplementation(async (request) => request.url.endsWith('/login') ? json(tokens('original')) : json({
    id: 'user-original', email: 'original@example.com', name: 'Original', trackCycle: false,
  }));
  await sessionStore.getState().login('original@example.com', 'password-one');
  await sessionStore.getState().logout();
  http.mockRejectedValue(new TypeError('Network request failed'));
  jest.isolateModules(() => {
    client = jest.requireActual('./client');
    sessionStore = jest.requireActual('../auth/session-store').useSessionStore;
  });
  await sessionStore.getState().initialize();
  expect(sessionStore.getState().user).toBeNull();
  expect(sessionStore.getState().status).not.toBe('authenticated');
  expect(await SecureStore.getItemAsync(profileKey)).toBeNull();
});

it('does not use a cached identity to bypass definitive server rejection', async () => {
  http.mockImplementation(async (request) => request.url.endsWith('/login') ? json(tokens('original')) : json({
    id: 'user-original', email: 'original@example.com', name: 'Original', trackCycle: false,
  }));
  await sessionStore.getState().login('original@example.com', 'password-one');
  http.mockImplementation(async () => json({ code: 'UNAUTHORIZED', message: 'Revoked' }, 401));
  await sessionStore.getState().initialize();
  expect(sessionStore.getState()).toMatchObject({ status: 'anonymous', user: null });
  expect(await SecureStore.getItemAsync(profileKey)).toBeNull();
});

it('invalidates visible account state when any authenticated request discovers revocation', async () => {
  http.mockImplementation(async (request) => request.url.endsWith('/login') ? json(tokens('original')) : json({
    id: 'user-original', email: 'original@example.com', name: 'Original', trackCycle: false,
  }));
  await sessionStore.getState().login('original@example.com', 'password-one');
  const scope = client.captureMobileSession();
  http.mockImplementation(async () => json({ code: 'UNAUTHORIZED', message: 'Revoked' }, 401));
  await client.withMobileAuth((api) => api.GET('/progress/overview'), scope).catch(() => undefined);
  expect(sessionStore.getState()).toMatchObject({ status: 'anonymous', user: null, session: null });
});

it('rejects a queued operation captured before a different account logged in', async () => {
  http.mockImplementation(async (request) => request.url.endsWith('/login') ? json(tokens('original')) : json({
    id: 'user-original', email: 'original@example.com', name: 'Original', trackCycle: false,
  }));
  await sessionStore.getState().login('original@example.com', 'password-one');
  const scope = client.captureMobileSession();
  await client.loginMobile('second@example.com', 'password-two');
  const sentBefore = http.mock.calls.length;
  await expect(client.withMobileAuth((api) => api.GET('/routines'), scope)).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  expect(http.mock.calls.length).toBe(sentBefore);
});

it('never sends a refresh token saved for another API environment', async () => {
  await SecureStore.setItemAsync(refreshKey, 'private-other-environment-token');
  await SecureStore.setItemAsync(originKey, 'https://other.example.com/api/v1');
  http.mockResolvedValue(json(tokens('wrong-server')));
  expect(await client.refreshMobileSession()).toBe(false);
  expect(http).not.toHaveBeenCalled();
  expect(await SecureStore.getItemAsync(refreshKey)).toBe('private-other-environment-token');
  await client.logoutMobile();
  expect(http).not.toHaveBeenCalled();
});

async function authenticatedSessionForSync(): Promise<MobileClient.MobileSession> {
  await client.loginMobile('sync@example.com', 'password-one');
  await client.currentUserWithRefresh();
  return client.captureMobileSession();
}

const syncBody: MobileClient.SyncWorkoutInput = {
  syncId: 'sync-1', clientId: 'workout-1', baseRevision: 0, status: 'ACTIVE',
  name: 'Fuerza', startedAt: '2026-08-30T10:00:00.000Z', sets: [], deletedSetClientIds: [],
};

it('rejects a malformed conflict server version while preserving the conflict error', async () => {
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) return json(tokens('sync'));
    if (request.url.endsWith('/users/me')) return json({ id: 'user-sync', email: 'sync@example.com', name: 'Sync', trackCycle: false });
    return json({
      code: 'REVISION_CONFLICT', message: 'Revisa la versión del servidor.', retryable: false, requestId: 'request-conflict',
      serverVersion: {},
    }, 409);
  });

  const result = await client.syncWorkoutWithRefresh(syncBody, await authenticatedSessionForSync());

  expect(result).toMatchObject({ status: 409, error: { code: 'REVISION_CONFLICT', message: 'Revisa la versión del servidor.' } });
  expect(result.error?.serverVersion).toBeUndefined();
});

it('preserves a normal API error when no conflict version is present', async () => {
  http.mockImplementation(async (request) => {
    if (request.url.endsWith('/login')) return json(tokens('sync'));
    if (request.url.endsWith('/users/me')) return json({ id: 'user-sync', email: 'sync@example.com', name: 'Sync', trackCycle: false });
    return json({
      code: 'VALIDATION_ERROR', message: 'La serie no es válida.', retryable: false, requestId: 'request-validation',
    }, 400);
  });

  const result = await client.syncWorkoutWithRefresh(syncBody, await authenticatedSessionForSync());

  expect(result).toMatchObject({ status: 400, error: { code: 'VALIDATION_ERROR', message: 'La serie no es válida.' } });
});
