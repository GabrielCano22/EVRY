import * as SecureStore from 'expo-secure-store';
import { createEvryApiClient, type components } from '@evry/api-client';
import type { DatabaseOwner } from '../db/database';

const REFRESH_TOKEN_KEY = 'evry.mobile.refresh-token';
const PROFILE_KEY = 'evry.mobile.profile-v1';
const TOKEN_ORIGIN_KEY = 'evry.mobile.token-origin';
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'http://10.0.2.2:4000/api/v1'
);

let accessToken: string | null = null;
let knownUser: CurrentUser | null = null;
let knownSession: MobileSession | null = null;
let sessionVersion = 0;
let tokenVersion = 0;
let refreshAllowed = true; // A fresh process may resume credentials from SecureStore.
let refreshFlight: { session: number; promise: Promise<boolean> } | null = null;
let storageQueue: Promise<unknown> = Promise.resolve();
const authClient = createEvryApiClient(API_BASE_URL, () => null);
const invalidationListeners = new Set<() => void>();

export type ApiErrorBody = components['schemas']['ApiError'];
export type CurrentUser = components['schemas']['User'];
export interface MobileSession extends DatabaseOwner { readonly version: number }
export type SyncWorkoutInput = components['schemas']['SyncWorkoutInput'];
export type SyncWorkoutResult = components['schemas']['SyncWorkoutResult'];
export type SyncConflictBody = ApiErrorBody & {
  serverVersion?: components['schemas']['SyncCanonicalWorkout'] | null;
};

function isSyncConflictBody(error: unknown): error is SyncConflictBody {
  return typeof error === 'object' && error !== null &&
    'code' in error && typeof error.code === 'string' &&
    'message' in error && typeof error.message === 'string' &&
    'retryable' in error && typeof error.retryable === 'boolean' &&
    'requestId' in error && typeof error.requestId === 'string' &&
    'serverVersion' in error;
}

function assertMobileSession(expected: number): void {
  if (expected !== sessionVersion) {
    throw apiError({ code: 'SESSION_CHANGED', message: 'La sesión cambió. Vuelve a intentar la operación.' }, '');
  }
}

export function captureMobileSession(): MobileSession {
  if (!knownUser) throw apiError({ code: 'UNAUTHORIZED', message: 'Inicia sesión para acceder a tus datos.' }, '', 401);
  if (!knownSession || knownSession.userId !== knownUser.id) {
    knownSession = Object.freeze({ userId: knownUser.id, serverUrl: API_BASE_URL, version: sessionVersion });
  }
  return knownSession;
}

export function isCurrentMobileSession(session: MobileSession | null): session is MobileSession {
  return Boolean(session && session.version === sessionVersion && session.userId === knownUser?.id && session.serverUrl === API_BASE_URL);
}

export function assertCurrentMobileSession(session: MobileSession): void {
  if (!isCurrentMobileSession(session)) {
    throw apiError({ code: 'SESSION_CHANGED', message: 'La sesión cambió. Vuelve a intentar la operación.' }, '');
  }
}

export function onMobileSessionInvalidated(listener: () => void): () => void {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
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
  knownUser = null;
  knownSession = null;
  refreshAllowed = false;
  refreshFlight = null;
  return sessionVersion;
}

async function deleteStoredSession(): Promise<void> {
  try { await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY); }
  finally {
    try { await SecureStore.deleteItemAsync(PROFILE_KEY); }
    finally { await SecureStore.deleteItemAsync(TOKEN_ORIGIN_KEY); }
  }
}

async function readScopedRefreshToken(): Promise<string | null> {
  // Unknown legacy tokens require login. Never send another environment's secret.
  if (await SecureStore.getItemAsync(TOKEN_ORIGIN_KEY) !== API_BASE_URL) return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function storeTokens(expected: number, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  await secureOperation(async () => {
    assertMobileSession(expected);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(TOKEN_ORIGIN_KEY, API_BASE_URL, {
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
  await secureOperation(deleteStoredSession);
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
      expected === sessionVersion ? readScopedRefreshToken() : null
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
      return await readScopedRefreshToken();
    } finally {
      await deleteStoredSession();
    }
  });
  // Only revoke the captured family. A delayed response must not clear a new login.
  if (refreshToken) {
    await authClient.POST('/auth/mobile/logout', { body: { refreshToken } }).catch(() => undefined);
  }
}

export async function clearMobileSession(): Promise<void> {
  beginSessionChange();
  invalidationListeners.forEach((listener) => listener());
  await secureOperation(deleteStoredSession);
}

type ApiClient = ReturnType<typeof createEvryApiClient>;

/** A request and its single 401 retry belong to one session, never the next account. */
export async function withMobileAuth<T extends { response: Response }>(
  operation: (client: ApiClient) => Promise<T>,
  session?: MobileSession,
): Promise<T> {
  if (session) assertCurrentMobileSession(session);
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
  const expected = sessionVersion;
  const response = await withMobileAuth((client) => client.GET('/users/me'));
  if (!response.data || response.error) {
    throw apiError(response.error, 'No se pudo recuperar el perfil.', response.response.status);
  }
  await secureOperation(async () => {
    assertMobileSession(expected);
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify({ serverUrl: API_BASE_URL, user: response.data }), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    assertMobileSession(expected);
    knownUser = response.data;
  });
  return response.data;
}

/** Only an encrypted identity saved after /users/me, with resumable credentials. */
export async function restoreCachedUser(): Promise<CurrentUser | null> {
  const expected = sessionVersion;
  return secureOperation(async () => {
    assertMobileSession(expected);
    if (!refreshAllowed || !await readScopedRefreshToken()) return null;
    const saved = await SecureStore.getItemAsync(PROFILE_KEY);
    assertMobileSession(expected);
    if (!saved) return null;
    try {
      const record = JSON.parse(saved) as { serverUrl?: unknown; user?: CurrentUser };
      const user = record.user;
      if (record.serverUrl !== API_BASE_URL || !user || typeof user.id !== 'string' || !user.id ||
        typeof user.email !== 'string' || typeof user.name !== 'string' || typeof user.trackCycle !== 'boolean') return null;
      knownUser = user;
      return user;
    } catch { return null; }
  });
}

export async function syncWorkoutWithRefresh(
  body: SyncWorkoutInput,
  session: MobileSession,
): Promise<{ data?: SyncWorkoutResult; error?: SyncConflictBody; status: number }> {
  assertCurrentMobileSession(session);
  const response = await withMobileAuth((client) => client.POST('/sync/workouts', { body }), session);
  return {
    data: response.data,
    error: isSyncConflictBody(response.error) ? response.error : undefined,
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
