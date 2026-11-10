import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import ProfileScreen from '../../app/(tabs)/profile';
import { API_BASE_URL, captureMobileSession, currentUserWithRefresh, loginMobile } from '../api/client';
import { useSessionStore } from '../auth/session-store';

// Keep the rendered screen, session ownership, query observers and generated
// client real; replace only external HTTP and native keychain/haptic boundaries.
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
jest.mock('expo-haptics', () => ({ impactAsync: async () => undefined,
  notificationAsync: jest.fn().mockResolvedValue(undefined), selectionAsync: async () => undefined,
  ImpactFeedbackStyle: { Medium: 'medium' }, NotificationFeedbackType: { Success: 'success' } }));

type Readiness = components['schemas']['Readiness'];
const dailyRecord: Readiness = { id: 'readiness-current', userId: 'readiness-user',
  date: '2026-10-07T15:00:00.000Z', civilDate: '2026-10-07T00:00:00.000Z',
  sleepHrs: 8, stress: 2, soreness: 2, motivation: 4, score: 81 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
let settleTransport: (() => void)[];
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  settleTransport.push(() => resolve(json(null)));
  return { promise, resolve };
}
const originalFetch = globalThis.fetch;
let client: QueryClient;
let userId: string;
let transport: (request: Request) => Promise<Response>;
let sent: Request[];
let now: number;
let appChange: ((state: AppStateStatus) => void) | null;
const originalAppState = AppState.currentState;
const originalSetTimeout = globalThis.setTimeout;
async function signIn(id = 'readiness-user') {
  userId = id;
  await loginMobile(`${id}@example.com`, 'valid-password');
  const user = await currentUserWithRefresh();
  useSessionStore.setState({ user, session: captureMobileSession(), status: 'authenticated' });
}
beforeEach(async () => {
  settleTransport = [];
  now = Date.parse('2026-10-07T15:00:00.000Z');
  appChange = null;
  AppState.currentState = 'active';
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    appChange = callback;
    return { remove: () => { appChange = null; } };
  });
  jest.mocked(Haptics.notificationAsync).mockClear();
  sent = [];
  transport = async () => json(dailyRecord);
  globalThis.fetch = jest.fn(async (request: Request) => {
    if (request.url.endsWith('/auth/mobile/login')) return json({ accessToken: 'readiness-access', refreshToken: 'readiness-refresh' });
    if (request.url.endsWith('/users/me')) return json({ id: userId, email: `${userId}@example.com`, name: userId,
      biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
      avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-10-07T12:00:00.000Z' });
    sent.push(request);
    return transport(request);
  }) as typeof fetch;
  // MutationCache.clear does not destroy its native five-minute GC timer.
  // Tests own the client/cleanup and need no timer for retaining unused saves.
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: Infinity } } });
  await signIn();
});
afterEach(async () => { await cleanup(); await act(async () => { settleTransport.forEach(settle => settle()); });
  client.clear(); globalThis.fetch = originalFetch;
  jest.restoreAllMocks(); AppState.currentState = originalAppState; globalThis.setTimeout = originalSetTimeout; });
const show = () => render(<QueryClientProvider client={client}><ProfileScreen /></QueryClientProvider>);
const press = async (name: string) => fireEvent.press(await screen.findByRole('button', { name }));
const app = async (state: AppStateStatus) => act(async () => { AppState.currentState = state; appChange?.(state); });

// After a Windows reboot on the D: HDD this first native render exceeded 30s;
// its warm diagnostic completed in 3.97s. The owner-authorized cold allowance
// applies only here, not CI or later cases, and is not an app performance gate.
it('distinguishes loading from a successful absent daily record with authenticated generated transport', async () => {
  const started = process.hrtime.bigint();
  const trace = (stage: string) => {
    if (process.env.EVRY_NATIVE_RENDER_TRACE === '1') {
      console.info('EVRY_NATIVE_RENDER_TRACE', stage, Number(process.hrtime.bigint() - started) / 1_000_000);
    }
  };
  const pending = deferred();
  transport = async () => pending.promise;
  trace('before-render');
  await show();
  trace('after-render');
  await waitFor(() => expect(sent).toHaveLength(1));
  trace('request-issued');
  expect(screen.getByText('Consultando readiness de hoy…')).toBeTruthy();
  expect(screen.queryByText('No has registrado readiness hoy.')).toBeNull();
  expect(screen.queryByText(/Puntaje actual:/)).toBeNull();
  await act(async () => { pending.resolve(json(null)); });
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  trace('response-visible');
  expect(screen.queryByText('Consultando readiness de hoy…')).toBeNull();
  expect(sent.map(request => [request.url, request.headers.get('Authorization')])).toEqual([
    [`${API_BASE_URL}/readiness/latest`, 'Bearer readiness-access'],
  ]);
}, process.platform === 'win32' && !process.env.CI ? 120_000 : 10_000);

it.each(['network', 'api'] as const)('recovers a %s failure without fabricating scores or resetting edited fields', async mode => {
  transport = async () => {
    if (mode === 'network') throw new TypeError('Sin conexión');
    return json({ code: 'SERVICE_UNAVAILABLE', message: 'Servidor no disponible.', retryable: true, requestId: 'daily-error' }, 503);
  };
  await show();
  expect(await screen.findByText('No pudimos consultar el registro de hoy.')).toBeTruthy();
  expect(screen.queryByText('No has registrado readiness hoy.')).toBeNull();
  expect(screen.queryByText(/Puntaje actual:/)).toBeNull();
  await press('Reducir Horas de sueño');
  expect(screen.getByText('6.5')).toBeTruthy();
  transport = async () => json(dailyRecord);
  await press('Reintentar readiness');
  expect(await screen.findByText('Puntaje actual: 81/100')).toBeTruthy();
  expect(screen.queryByText('No pudimos consultar el registro de hoy.')).toBeNull();
  expect(screen.getByText('6.5')).toBeTruthy();
  expect(sent).toHaveLength(2);
});

it('labels a retained canonical score when its manual refresh fails', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  transport = async () => { throw new TypeError('Sin conexión'); };
  await press('Actualizar readiness');
  expect(await screen.findByText('No pudimos consultar el registro de hoy.')).toBeTruthy();
  expect(screen.getByText('Puntaje actual: 81/100')).toBeTruthy();
  expect(screen.getByText('Se conserva el último puntaje consultado; no se pudo actualizar.')).toBeTruthy();
  expect(screen.queryByText('No has registrado readiness hoy.')).toBeNull();
});

it('does not turn an undocumented no-content response into an absent daily record', async () => {
  transport = async () => new Response(null, { status: 204 });
  await show();
  expect(await screen.findByText('No pudimos consultar el registro de hoy.')).toBeTruthy();
  expect(screen.queryByText('No has registrado readiness hoy.')).toBeNull();
  expect(screen.queryByText(/Puntaje actual:/)).toBeNull();
});

it('cancels the generated query on unmount and ignores uncancellable late transport', async () => {
  const pending = deferred();
  transport = async () => pending.promise;
  const view = await show();
  await waitFor(() => expect(sent).toHaveLength(1));
  const request = sent[0];
  await view.unmount();
  expect(request.signal.aborted).toBe(true);
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(client.getQueryCache().getAll().every(query => query.state.data === undefined)).toBe(true);
});

it.each(['account', 'login-version'] as const)('isolates readiness from a previous %s in a retained query provider', async mode => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  const pending = deferred();
  transport = async () => pending.promise;
  await act(async () => { await signIn(mode === 'account' ? 'other-readiness-user' : 'readiness-user'); });
  await waitFor(() => expect(sent).toHaveLength(2));
  expect(screen.queryByText('Puntaje actual: 81/100')).toBeNull();
  expect(screen.getByText('Consultando readiness de hoy…')).toBeTruthy();
  await act(async () => { pending.resolve(json(null)); });
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
});

it.each(['account', 'login-version'] as const)('ignores a late readiness response from a superseded %s', async mode => {
  const pending = deferred();
  transport = async () => pending.promise;
  await show();
  await waitFor(() => expect(sent).toHaveLength(1));
  const oldRequest = sent[0];
  transport = async () => json({ ...dailyRecord, userId: mode === 'account' ? 'other-readiness-user' : 'readiness-user', score: 63 });
  await act(async () => { await signIn(mode === 'account' ? 'other-readiness-user' : 'readiness-user'); });
  expect(await screen.findByText('Puntaje actual: 63/100')).toBeTruthy();
  expect(oldRequest.signal.aborted).toBe(true);
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(screen.queryByText('Puntaje actual: 81/100')).toBeNull();
  expect(screen.getByText('Puntaje actual: 63/100')).toBeTruthy();
});

it('disables duplicate refreshes while a retry is pending and keeps the form usable', async () => {
  transport = async () => { throw new TypeError('Sin conexión'); };
  await show();
  await screen.findByText('No pudimos consultar el registro de hoy.');
  const pending = deferred();
  transport = async () => pending.promise;
  await press('Reintentar readiness');
  await waitFor(() => expect(sent).toHaveLength(2));
  // A first-load retry has no data: Query transitions error -> pending, so the
  // control uses its regular label while the actual request remains in flight.
  const retryButton = await screen.findByRole('button', { name: 'Actualizar readiness' });
  expect(retryButton).toBeDisabled();
  await fireEvent.press(retryButton);
  expect(sent).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Guardar readiness' })).toBeEnabled();
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(await screen.findByText('Puntaje actual: 81/100')).toBeTruthy();
});

it('recovers the actual day after multiple background days without discarding the profile draft', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Perfil sin guardar');
  await press('Reducir Horas de sueño');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('7.5');
  await app('background');
  now = Date.parse('2026-10-09T15:00:00.000Z');
  transport = async () => json(null);
  await app('active');
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(screen.queryByText('Puntaje actual: 81/100')).toBeNull();
  expect(screen.queryByText('7.5')).toBeNull();
  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.getByDisplayValue('Perfil sin guardar')).toBeTruthy();
  expect(sent.map(request => request.method)).toEqual(['GET', 'GET']);
});

it('changes day at Bogotá midnight, not at UTC midnight, without duplicate same-day queries', async () => {
  now = Date.parse('2026-10-07T23:59:59.000Z');
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await app('background');
  now = Date.parse('2026-10-08T00:00:01.000Z');
  await app('active');
  expect(sent).toHaveLength(1);
  expect(screen.getByText('Puntaje actual: 81/100')).toBeTruthy();
  await app('background');
  now = Date.parse('2026-10-08T05:00:01.000Z');
  transport = async () => json(null);
  await app('active');
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(sent).toHaveLength(2);
  await app('active');
  expect(sent).toHaveLength(2);
});

it('updates a foreground profile at its scheduled civil midnight', async () => {
  now = Date.parse('2026-10-08T04:59:59.000Z');
  let midnightCallback: (() => void) | undefined;
  // Forward real timers without Jest mock metadata, which RNTL interprets as
  // fake timers. Only delivery of the first one-second deadline is controlled.
  globalThis.setTimeout = ((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    if (delay === 1000 && !midnightCallback) midnightCallback = () => callback(...args);
    return originalSetTimeout(callback, delay, ...args);
  }) as typeof globalThis.setTimeout;
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  expect(typeof midnightCallback).toBe('function');
  now = Date.parse('2026-10-08T05:00:00.000Z');
  transport = async () => json(null);
  await act(async () => { midnightCallback?.(); });
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(screen.queryByText('Puntaje actual: 81/100')).toBeNull();
  expect(sent).toHaveLength(2);
});

it('cancels yesterday’s pending query and ignores its late response after foreground recovery', async () => {
  const pending = deferred();
  transport = async () => pending.promise;
  await show();
  await waitFor(() => expect(sent).toHaveLength(1));
  const oldRequest = sent[0];
  await app('background');
  now = Date.parse('2026-10-08T15:00:00.000Z');
  transport = async () => json(null);
  await app('active');
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(oldRequest.signal.aborted).toBe(true);
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(screen.queryByText('Puntaje actual: 81/100')).toBeNull();
});

it('does not keep yesterday’s confirmed save as today’s success', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  await app('background');
  now = Date.parse('2026-10-08T15:00:00.000Z');
  transport = async () => json(null);
  await app('active');
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
  expect(sent.filter(request => request.method === 'POST')).toHaveLength(1);
});

it('does not announce or vibrate a pending save from yesterday after its form is superseded', async () => {
  const pending = deferred();
  transport = async request => request.method === 'POST' ? pending.promise : json(dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Guardar readiness');
  await waitFor(() => expect(sent.some(request => request.method === 'POST')).toBe(true));
  await app('background');
  now = Date.parse('2026-10-08T15:00:00.000Z');
  transport = async () => json(null);
  await app('active');
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(sent.filter(request => request.method === 'POST')).toHaveLength(1);
});

it('rejects submission from a stale day before sending and moves to the actual day', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  now = Date.parse('2026-10-08T15:00:00.000Z');
  transport = async () => json(null);
  await press('Guardar readiness');
  expect(sent.filter(request => request.method === 'POST')).toHaveLength(0);
  expect(await screen.findByText('No has registrado readiness hoy.')).toBeTruthy();
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
});

it('stops its midnight timer in background and removes native delivery on unmount', async () => {
  let deadlineCallback: (() => void) | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  globalThis.setTimeout = ((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const timer = originalSetTimeout(callback, delay, ...args);
    if (delay === 50_400_000) { deadlineCallback = () => callback(...args); deadlineTimer = timer; }
    return timer;
  }) as typeof globalThis.setTimeout;
  const clear = jest.spyOn(globalThis, 'clearTimeout');
  const view = await show();
  await screen.findByText('Puntaje actual: 81/100');
  expect(typeof deadlineCallback).toBe('function');
  expect(appChange).not.toBeNull();
  await app('background');
  expect(clear).toHaveBeenCalledWith(deadlineTimer);
  now = Date.parse('2026-10-08T15:00:00.000Z');
  await act(async () => { deadlineCallback?.(); });
  expect(sent).toHaveLength(1);
  transport = async () => json(null);
  await app('active');
  await screen.findByText('No has registrado readiness hoy.');
  await view.unmount();
  expect(appChange).toBeNull();
  expect(clear).toHaveBeenCalledWith(deadlineTimer);
  now = Date.parse('2026-10-09T15:00:00.000Z');
  await act(async () => { deadlineCallback?.(); });
  expect(sent).toHaveLength(2);
});

it('does not refresh or vibrate a confirmed save after the same-owner screen unmounts', async () => {
  const pending = deferred();
  transport = async request => request.method === 'POST' ? pending.promise : json(dailyRecord);
  const view = await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Guardar readiness');
  await waitFor(() => expect(sent.some(request => request.method === 'POST')).toBe(true));
  await view.unmount();
  await act(async () => { pending.resolve(json(dailyRecord)); });
  await waitFor(() => expect(client.getMutationCache().getAll().every(mutation => mutation.state.status === 'success')).toBe(true));
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(sent.map(request => request.method)).toEqual(['GET', 'POST']);
});

it('hydrates the existing daily fields instead of silently submitting standard defaults', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  expect(screen.getByText('8')).toBeTruthy();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('8');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('2');
  expect(screen.getByLabelText('Valor de Dolor muscular')).toHaveTextContent('2');
  expect(screen.getByLabelText('Valor de Motivación')).toHaveTextContent('4');
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  expect(await sent.find(request => request.method === 'POST')!.clone().json()).toEqual({
    sleepHrs: 8, stress: 2, soreness: 2, motivation: 4,
  });
});

it('preserves stored null fields visibly and in the generated POST body', async () => {
  const stored = { ...dailyRecord, sleepHrs: null, stress: 4, soreness: null, motivation: 2, score: 63 };
  transport = async request => json(request.method === 'POST' ? { ...stored, score: 60 } : stored);
  await show();
  await screen.findByText('Puntaje actual: 63/100');
  expect(screen.getAllByText('Sin registrar')).toHaveLength(2);
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('Sin registrar');
  expect(screen.getByLabelText('Valor de Dolor muscular')).toHaveTextContent('Sin registrar');
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  expect(await sent.find(request => request.method === 'POST')!.clone().json()).toEqual({
    sleepHrs: null, stress: 4, soreness: null, motivation: 2,
  });
});

it('explicitly clears a recorded field without changing other canonical answers', async () => {
  const cleared = { ...dailyRecord, sleepHrs: null, score: 80 };
  transport = async request => json(request.method === 'POST' ? cleared : dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Dejar sin registrar Horas de sueño');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('Sin registrar');
  await press('Guardar readiness');
  expect(await screen.findByText('Puntaje actual: 80/100')).toBeTruthy();
  expect(await sent.find(request => request.method === 'POST')!.clone().json()).toEqual({
    sleepHrs: null, stress: 2, soreness: 2, motivation: 4,
  });
});

it('hydrates untouched fields after a pending load without replacing an edited answer', async () => {
  const pending = deferred();
  transport = async () => pending.promise;
  await show();
  await waitFor(() => expect(sent).toHaveLength(1));
  await press('Reducir Horas de sueño');
  await act(async () => { pending.resolve(json(dailyRecord)); });
  await screen.findByText('Puntaje actual: 81/100');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('6.5');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('2');
  expect(screen.getByLabelText('Valor de Motivación')).toHaveTextContent('4');
});

it('retains edited fields while adopting untouched answers from a successful refresh', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Aumentar Horas de sueño');
  transport = async () => json({ ...dailyRecord, sleepHrs: 5, stress: 1, soreness: 5, motivation: 5, score: 40 });
  await press('Actualizar readiness');
  await screen.findByText('Puntaje actual: 40/100');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('8.5');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('1');
  expect(screen.getByLabelText('Valor de Dolor muscular')).toHaveTextContent('5');
  expect(screen.getByLabelText('Valor de Motivación')).toHaveTextContent('5');
});

it('uses the confirmed POST score and form without a second GET or invented calculation', async () => {
  const saved = { ...dailyRecord, sleepHrs: 7.5, stress: null, score: 78 };
  transport = async request => json(request.method === 'POST' ? saved : dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Reducir Horas de sueño');
  await press('Dejar sin registrar Estrés');
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  expect(screen.getByText('Puntaje actual: 78/100')).toBeTruthy();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('7.5');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('Sin registrar');
  expect(sent.map(request => request.method)).toEqual(['GET', 'POST']);
});

it('preserves newer edits made during saving and marks them as not yet saved', async () => {
  const pending = deferred();
  transport = async request => request.method === 'POST' ? pending.promise : json(dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Guardar readiness');
  await waitFor(() => expect(sent.some(request => request.method === 'POST')).toBe(true));
  await press('Aumentar Horas de sueño');
  await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(await screen.findByText('Registro guardado; tienes cambios sin guardar.')).toBeTruthy();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('8.5');
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
  expect(await sent.find(request => request.method === 'POST')!.clone().json()).toEqual({
    sleepHrs: 8, stress: 2, soreness: 2, motivation: 4,
  });
});

it.each(['pending', 'confirmed'] as const)('recognizes reverted answers as saved after a %s POST', async phase => {
  const pending = deferred();
  transport = async request => request.method === 'POST' ? pending.promise : json(dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Guardar readiness');
  await waitFor(() => expect(sent.some(request => request.method === 'POST')).toBe(true));
  if (phase === 'confirmed') {
    await act(async () => { pending.resolve(json(dailyRecord)); });
    await screen.findByText('Readiness guardado para hoy.');
  }
  await press('Aumentar Horas de sueño');
  await press('Reducir Horas de sueño');
  if (phase === 'pending') await act(async () => { pending.resolve(json(dailyRecord)); });
  expect(await screen.findByText('Readiness guardado para hoy.')).toBeTruthy();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('8');
  expect(screen.queryByText('Registro guardado; tienes cambios sin guardar.')).toBeNull();
  expect(sent.map(request => request.method)).toEqual(['GET', 'POST']);
});

it('keeps edited nullable answers after a failed save instead of restoring old fields', async () => {
  transport = async request => {
    if (request.method === 'POST') throw new TypeError('Sin conexión');
    return json(dailyRecord);
  };
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Dejar sin registrar Horas de sueño');
  await press('Aumentar Estrés');
  await press('Guardar readiness');
  await screen.findByText('Sin conexión');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('Sin registrar');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('3');
  expect(screen.getByText('Puntaje actual: 81/100')).toBeTruthy();
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
});

it.each([
  { sleepHrs: 17 }, { stress: 1.5 }, { motivation: undefined },
])('rejects incompatible returned readiness fields %j without showing an invalid score', async fields => {
  transport = async () => json({ ...dailyRecord, ...fields });
  await show();
  expect(await screen.findByText('No pudimos consultar el registro de hoy.')).toBeTruthy();
  expect(screen.queryByText(/Puntaje actual:/)).toBeNull();
});

it('does not mark bounded no-op stepper presses as unsaved changes', async () => {
  transport = async () => json({ ...dailyRecord, sleepHrs: 16, stress: 5, soreness: 1, motivation: 1, score: 60 });
  await show();
  await screen.findByText('Puntaje actual: 60/100');
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  await press('Aumentar Horas de sueño');
  await press('Aumentar Estrés');
  await press('Reducir Dolor muscular');
  await press('Reducir Motivación');
  expect(screen.getByText('Readiness guardado para hoy.')).toBeTruthy();
  expect(screen.queryByText('Registro guardado; tienes cambios sin guardar.')).toBeNull();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('16');
  expect(screen.getByLabelText('Valor de Estrés')).toHaveTextContent('5');
  expect(screen.getByLabelText('Valor de Dolor muscular')).toHaveTextContent('1');
  expect(screen.getByLabelText('Valor de Motivación')).toHaveTextContent('1');
});

it('cancels a pre-save GET so its late response cannot replace the confirmed POST', async () => {
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  const pending = deferred();
  transport = async request => request.method === 'GET' ? pending.promise : json({ ...dailyRecord, score: 85 });
  await press('Actualizar readiness');
  await waitFor(() => expect(sent).toHaveLength(2));
  const oldRequest = sent[1];
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  expect(oldRequest.signal.aborted).toBe(true);
  expect(screen.getByText('Puntaje actual: 85/100')).toBeTruthy();
  await act(async () => { pending.resolve(json({ ...dailyRecord, sleepHrs: 4, stress: 5, score: 20 })); });
  expect(screen.queryByText('Puntaje actual: 20/100')).toBeNull();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('8');
  expect(screen.getByText('Puntaje actual: 85/100')).toBeTruthy();
  expect(sent.map(request => request.method)).toEqual(['GET', 'GET', 'POST']);
});

it('keeps all explicitly cleared answers null after saving and only registers zero on an explicit step', async () => {
  transport = async request => json(request.method === 'POST'
    ? { ...dailyRecord, sleepHrs: null, stress: null, soreness: null, motivation: null, score: 70 } : dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  for (const label of ['Horas de sueño', 'Estrés', 'Dolor muscular', 'Motivación']) await press(`Dejar sin registrar ${label}`);
  await press('Guardar readiness');
  await screen.findByText('Readiness guardado para hoy.');
  expect(screen.getAllByText('Sin registrar')).toHaveLength(4);
  expect(await sent.find(request => request.method === 'POST')!.clone().json()).toEqual({
    sleepHrs: null, stress: null, soreness: null, motivation: null,
  });
  await press('Aumentar Horas de sueño');
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('0');
  expect(screen.getAllByText('Sin registrar')).toHaveLength(3);
});

it('keeps the draft and cached score when the POST returns incompatible fields', async () => {
  transport = async request => json(request.method === 'POST' ? { ...dailyRecord, stress: 6 } : dailyRecord);
  await show();
  await screen.findByText('Puntaje actual: 81/100');
  await press('Reducir Horas de sueño');
  await press('Guardar readiness');
  expect(await screen.findByText('El servidor devolvió un readiness incompatible. Reintenta.')).toBeTruthy();
  expect(screen.getByText('Puntaje actual: 81/100')).toBeTruthy();
  expect(screen.getByLabelText('Valor de Horas de sueño')).toHaveTextContent('7.5');
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(sent.map(request => request.method)).toEqual(['GET', 'POST']);
});
