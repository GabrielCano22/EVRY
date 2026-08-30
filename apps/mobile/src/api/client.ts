import * as SecureStore from 'expo-secure-store';
import { createEvryApiClient, type components } from '@evry/api-client';

const REFRESH_TOKEN_KEY = 'evry.mobile.refresh-token';
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'http://10.0.2.2:4000/api/v1'
);

let accessToken: string | null = null;
let sessionVersion = 0;
let tokenVersion = 0;
let refreshAllowed = true; // A fresh process may resume credentials from SecureStore.
let refreshFlight: { session: number; promise: Promise<boolean> } | null = null;
let storageQueue: Promise<unknown> = Promise.resolve();
const authClient = createEvryApiClient(API_BASE_URL, () => null);

export type ApiErrorBody = components['schemas']['ApiError'];
export type CurrentUser = components['schemas']['User'];
export type SyncWorkoutInput = components['schemas']['SyncWorkoutInput'];
export type SyncWorkoutResult = components['schemas']['SyncWorkoutResult'];
export type SyncConflictBody = ApiErrorBody & {
  serverVersion?: components['schemas']['Workout'] | null;
};

function assertMobileSession(expected: number): void {
  if (expected !== sessionVersion) {
    throw apiError({ code: 'SESSION_CHANGED', message: 'La sesión cambió. Vuelve a intentar la operación.' }, '');
  }
}

// Native keychain writes cannot be cancelled. Serialize them so an older write
// always finishes before logout deletes it or a newer login replaces it.
function secureOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => undefined);
  return result;
}

function beginSessionChange(): number {
  sessionVersion += 1;
  accessToken = null;
  refreshAllowed = false;
  refreshFlight = null;
  return sessionVersion;
}

async function storeTokens(expected: number, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  await secureOperation(async () => {
    assertMobileSession(expected);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    assertMobileSession(expected);
    accessToken = tokens.accessToken;
    tokenVersion += 1;
    refreshAllowed = true;
  });
}

export async function loginMobile(email: string, password: string): Promise<void> {
  const expected = beginSessionChange();
  await secureOperation(() => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY));
  assertMobileSession(expected);
  const { data, error, response } = await authClient.POST('/auth/mobile/login', {
    body: { email: email.trim().toLowerCase(), password },
  });
  assertMobileSession(expected);
  if (!data || error) throw apiError(error, 'No se pudo iniciar sesión.', response.status);
  try {
    await storeTokens(expected, data);
  } catch (error) {
    if (expected === sessionVersion) await clearMobileSession().catch(() => undefined);
    throw error;
  }
}

export function refreshMobileSession(expected = sessionVersion): Promise<boolean> {
  if (expected !== sessionVersion || !refreshAllowed) return Promise.resolve(false);
  if (refreshFlight?.session === expected) return refreshFlight.promise;

  const promise = rotateTokens(expected).finally(() => {
    if (refreshFlight?.promise === promise) refreshFlight = null;
  });
  refreshFlight = { session: expected, promise };
  return promise;
}

async function rotateTokens(expected: number): Promise<boolean> {
  let consumed = false;
  try {
    const refreshToken = await secureOperation(async () => (
      expected === sessionVersion ? SecureStore.getItemAsync(REFRESH_TOKEN_KEY) : null
    ));
    if (!refreshToken || expected !== sessionVersion) return false;
    const { data, error, response } = await authClient.POST('/auth/mobile/refresh', {
      body: { refreshToken },
    });
    if (expected !== sessionVersion) return false;
    if (!data || error) {
      if (response.status === 401) await clearMobileSession();
      else throw apiError(error, 'No se pudo renovar la sesión.', response.status);
      return false;
    }
    consumed = true;
    await storeTokens(expected, data);
    return true;
  } catch (error) {
    if (expected !== sessionVersion) return false;
    // The old token has already been consumed by the server. Reusing it after a
    // keychain failure would revoke the family; require a new login instead.
    if (consumed) await clearMobileSession().catch(() => undefined);
    throw error;
  }
}

export async function logoutMobile(): Promise<void> {
  beginSessionChange();
  const refreshToken = await secureOperation(async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } finally {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  });
  // Only revoke the captured family. A delayed response must not clear a new login.
  if (refreshToken) {
    await authClient.POST('/auth/mobile/logout', { body: { refreshToken } }).catch(() => undefined);
  }
}

export async function clearMobileSession(): Promise<void> {
  beginSessionChange();
  await secureOperation(() => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY));
}

type ApiClient = ReturnType<typeof createEvryApiClient>;

/** A request and its single 401 retry belong to one session, never the next account. */
export async function withMobileAuth<T extends { response: Response }>(
  operation: (client: ApiClient) => Promise<T>,
): Promise<T> {
  const expected = sessionVersion;
  const attemptedToken = tokenVersion;
  const attempt = async () => {
    assertMobileSession(expected);
    const token = accessToken;
    const client = createEvryApiClient(API_BASE_URL, () => {
      assertMobileSession(expected);
      return token;
    });
    const response = await operation(client);
    assertMobileSession(expected);
    return response;
  };
  const response = await attempt();
  if (response.response.status !== 401) return response;
  // Another request may have already rotated while this 401 was in flight.
  const refreshed = attemptedToken !== tokenVersion || await refreshMobileSession(expected);
  assertMobileSession(expected);
  if (!refreshed) return response;
  const retriedToken = tokenVersion;
  const retried = await attempt();
  assertMobileSession(expected);
  if (retried.response.status === 401 && retriedToken === tokenVersion) {
    await clearMobileSession();
  }
  return retried;
}

export async function currentUserWithRefresh(): Promise<CurrentUser> {
  const response = await withMobileAuth((client) => client.GET('/users/me'));
  if (!response.data || response.error) {
    throw apiError(response.error, 'No se pudo recuperar el perfil.', response.response.status);
  }
  return response.data;
}

export async function syncWorkoutWithRefresh(
  body: SyncWorkoutInput,
): Promise<{ data?: SyncWorkoutResult; error?: SyncConflictBody; status: number }> {
  const response = await withMobileAuth((client) => client.POST('/sync/workouts', { body }));
  return {
    data: response.data,
    error: response.error as SyncConflictBody | undefined,
    status: response.response.status,
  };
}

export function apiError(error: unknown, fallback: string, status?: number): Error & { code?: string; status?: number } {
  const record = typeof error === 'object' && error !== null ? error as Partial<ApiErrorBody> : {};
  const normalized = new Error(typeof record.message === 'string' ? record.message : fallback) as Error & {
    code?: string;
    status?: number;
  };
  normalized.code = record.code;
  normalized.status = status;
  return normalized;
}
