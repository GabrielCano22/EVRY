import type { PropsWithChildren } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, type CurrentUser } from '../api/client';
import { useSessionStore } from './session-store';
import { useTrainingStore } from '../training/training-store';

// Keep RootLayout's effects, identity restoration, stores, query scope and SQL
// real. Navigation rendering and native services are external boundaries;
// assertions below inspect restored application state, not these doubles.
jest.mock('expo-router', () => {
  const { DarkTheme, ThemeProvider } = jest.requireActual<typeof import('expo-router/react-navigation')>('expo-router/react-navigation');
  const Stack = Object.assign(({ children }: PropsWithChildren) => children, { Screen: () => null });
  return { Stack, ThemeProvider, DarkTheme };
});
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
// Notifications are a native boundary. Mock the module so its Expo Go push
// auto-registration effect does not run inside Jest; the coordinator's own
// behaviour is covered by its dedicated suites.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => undefined,
  hideAsync: async () => undefined,
}));
jest.mock('react-native-reanimated', () => {
  throw new Error('Optional animation runtime unavailable during offline bootstrap');
});
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
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: {
  fetch: async () => ({ type: 'none', isConnected: false, isInternetReachable: false, details: null }),
  addEventListener: () => () => undefined,
} }));

// Resolve the real module during suite setup, like the other screen tests.
// Jest/Babel's cold module loading is not the asynchronous restoration tested
// below. An accidental optional-runtime import still fails this suite.
const RootLayout = jest.requireActual<typeof import('../../app/_layout')>('../../app/_layout').default;
const originalFetch = globalThis.fetch;
const cachedUser: CurrentUser = { id: 'bootstrap-user', email: 'bootstrap@example.test', name: 'Offline',
  biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-10-10T12:00:00.000Z' };

afterEach(async () => { await cleanup(); globalThis.fetch = originalFetch; });

it('restores the cached account and its local storage without an unused animation backend', async () => {
  await SecureStore.setItemAsync('evry.mobile.refresh-token', 'bootstrap-cached-refresh');
  await SecureStore.setItemAsync('evry.mobile.token-origin', API_BASE_URL);
  await SecureStore.setItemAsync('evry.mobile.profile-v1', JSON.stringify({ serverUrl: API_BASE_URL, user: cachedUser }));
  globalThis.fetch = (async () => { throw new TypeError('Synthetic offline transport'); }) as typeof fetch;

  const boot = async () => {
    await render(<RootLayout />);
    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', offline: true,
        user: { id: 'bootstrap-user', email: 'bootstrap@example.test', name: 'Offline' } });
      expect(useTrainingStore.getState()).toMatchObject({ ready: true, error: null,
        session: { userId: 'bootstrap-user', serverUrl: API_BASE_URL } });
    });
    expect(await SecureStore.getItemAsync('evry.mobile.refresh-token')).toBe('bootstrap-cached-refresh');
  };
  await expect(boot()).resolves.toBeUndefined();
}, process.platform === 'win32' && !process.env.CI ? 30_000 : 10_000);
