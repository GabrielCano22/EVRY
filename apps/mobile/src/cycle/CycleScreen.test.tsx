import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { components } from '@evry/api-client';
import CycleScreen from '../../app/(tabs)/cycle';
import { captureMobileSession, currentUserWithRefresh, loginMobile } from '../api/client';
import { useSessionStore } from '../auth/session-store';

// Keep the screen, mutation/cache observers and authenticated generated client
// real. Only HTTP, native keychain, confirmation UI and vibration are replaced.
jest.mock('@evry/api-client', () => {
  const actual = jest.requireActual<typeof import('@evry/api-client')>('@evry/api-client');
  return { ...actual, createEvryApiClient: (base: string, token: import('@evry/api-client').AccessTokenProvider) =>
    actual.createEvryApiClient(base, token, { fetch: request => globalThis.fetch(request) }) };
});
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    deleteItemAsync: async (key: string) => { values.delete(key); } };
});
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 'success' } }));

const entry: components['schemas']['CycleEntry'] = {
  id: 'owned-cycle-entry', userId: 'cycle-user', date: '2026-10-07T00:00:00.000Z',
  flow: 'LIGHT', symptoms: [], energy: 3, mood: 4, notes: null, isPeriodStart: true,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const originalFetch = globalThis.fetch;
let client: QueryClient;
let entries: typeof entry[];
let sent: Request[];
let failDelete: boolean;
let settleHaptic: (() => void) | undefined;

beforeEach(async () => {
  entries = [entry]; sent = []; failDelete = false; settleHaptic = undefined;
  jest.mocked(Haptics.selectionAsync).mockReset().mockResolvedValue(undefined);
  globalThis.fetch = jest.fn(async (request: Request) => {
    if (request.url.endsWith('/auth/mobile/login')) return json({ accessToken: 'cycle-access', refreshToken: 'cycle-refresh' });
    if (request.url.endsWith('/users/me')) return json({ id: 'cycle-user', email: 'cycle@example.test', name: 'Eva',
      biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: true,
      avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-10-07T12:00:00.000Z' });
    sent.push(request);
    if (request.headers.get('Authorization') !== 'Bearer cycle-access') return json({ code: 'UNAUTHORIZED' }, 401);
    if (new URL(request.url).pathname.endsWith('/cycle/entries') && request.method === 'GET') return json(entries);
    if (request.url.endsWith('/cycle/entries/owned-cycle-entry') && request.method === 'DELETE') {
      if (failDelete) return json({ code: 'SERVICE_UNAVAILABLE', message: 'No disponible.', retryable: true, requestId: 'cycle-delete' }, 503);
      entries = [];
      return json({ ok: true });
    }
    throw new Error('Unexpected synthetic cycle request');
  }) as typeof fetch;
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find(button => button.text === 'Eliminar')?.onPress?.();
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: Infinity } } });
  await loginMobile('cycle@example.test', 'valid-password');
  const user = await currentUserWithRefresh();
  useSessionStore.setState({ user, session: captureMobileSession(), status: 'authenticated' });
});
afterEach(async () => {
  await cleanup();
  await act(async () => { settleHaptic?.(); });
  client.clear(); globalThis.fetch = originalFetch; jest.restoreAllMocks();
});
async function show() {
  await render(<QueryClientProvider client={client}><CycleScreen /></QueryClientProvider>);
  await screen.findByText('2026-10-07');
}
async function confirmedDeleteWithOptionalHaptics(mode: 'rejected' | 'pending') {
  await show();
  if (mode === 'rejected') jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Vibración no disponible'));
  else jest.mocked(Haptics.selectionAsync).mockImplementationOnce(() => new Promise(resolve => { settleHaptic = resolve; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
  await waitFor(() => expect(screen.queryByText('2026-10-07')).toBeNull());
  expect(screen.getByText('Aún no hay registros. Puedes empezar con el día de hoy.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(sent.map(request => request.method)).toEqual(['GET', 'DELETE', 'GET']);
  expect(entries).toEqual([]);
}

it('refreshes a confirmed deletion when optional vibration rejects', async () => {
  await confirmedDeleteWithOptionalHaptics('rejected');
}, process.platform === 'win32' && !process.env.CI ? 30_000 : 10_000);
it('refreshes a confirmed deletion without waiting for optional vibration', async () => {
  await confirmedDeleteWithOptionalHaptics('pending');
});
it('retains the entry and shows a real DELETE error without success feedback', async () => {
  failDelete = true;
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar el registro.');
  expect(screen.getByText('2026-10-07')).toBeTruthy();
  expect(entries).toEqual([entry]);
  expect(sent.map(request => request.method)).toEqual(['GET', 'DELETE']);
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});
