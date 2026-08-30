import * as SecureStore from 'expo-secure-store';
import { createEvryApiClient, type components } from '@evry/api-client';

const REFRESH_TOKEN_KEY = 'evry.mobile.refresh-token';
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'http://10.0.2.2:4000/api/v1'
);

let accessToken: string | null = null;
export const apiClient = createEvryApiClient(API_BASE_URL, () => accessToken);

export type ApiErrorBody = components['schemas']['ApiError'];
export type CurrentUser = components['schemas']['User'];
export type SyncWorkoutInput = components['schemas']['SyncWorkoutInput'];
export type SyncWorkoutResult = components['schemas']['SyncWorkoutResult'];
export type SyncConflictBody = ApiErrorBody & {
  serverVersion?: components['schemas']['Workout'] | null;
};

export function setMobileAccessToken(token: string | null): void {
  accessToken = token;
}

export async function loginMobile(email: string, password: string): Promise<void> {
  const { data, error } = await apiClient.POST('/auth/mobile/login', {
    body: { email: email.trim().toLowerCase(), password },
  });
  if (!data || error) throw apiError(error, 'No se pudo iniciar sesión.');
  setMobileAccessToken(data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function refreshMobileSession(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const { data, error } = await apiClient.POST('/auth/mobile/refresh', {
    body: { refreshToken },
  });
  if (!data || error) {
    if ((error as ApiErrorBody | undefined)?.code === 'UNAUTHORIZED') {
      await clearMobileSession();
    }
    return false;
  }
  setMobileAccessToken(data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return true;
}

export async function logoutMobile(): Promise<void> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    await apiClient.POST('/auth/mobile/logout', { body: { refreshToken } }).catch(() => undefined);
  }
  await clearMobileSession();
}

export async function clearMobileSession(): Promise<void> {
  setMobileAccessToken(null);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function currentUserWithRefresh(): Promise<CurrentUser> {
  let response = await apiClient.GET('/users/me');
  if (response.response.status === 401 && await refreshMobileSession()) {
    response = await apiClient.GET('/users/me');
  }
  if (!response.data || response.error) {
    throw apiError(response.error, 'No se pudo recuperar el perfil.');
  }
  return response.data;
}

export async function syncWorkoutWithRefresh(
  body: SyncWorkoutInput,
): Promise<{ data?: SyncWorkoutResult; error?: SyncConflictBody; status: number }> {
  let response = await apiClient.POST('/sync/workouts', { body });
  if (response.response.status === 401 && await refreshMobileSession()) {
    response = await apiClient.POST('/sync/workouts', { body });
  }
  return {
    data: response.data,
    error: response.error as SyncConflictBody | undefined,
    status: response.response.status,
  };
}

export function apiError(error: unknown, fallback: string): Error & { code?: string; status?: number } {
  const record = typeof error === 'object' && error !== null ? error as Partial<ApiErrorBody> : {};
  const normalized = new Error(typeof record.message === 'string' ? record.message : fallback) as Error & {
    code?: string;
    status?: number;
  };
  normalized.code = record.code;
  return normalized;
}
