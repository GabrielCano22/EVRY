import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { RestTimerState } from '@evry/domain';
import TrainScreen from '../../app/(tabs)/train';
import { useSessionStore } from '../auth/session-store';
import { loadRestTimer, saveRestTimer } from '../db/database';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

// Real Train, query observers, Zustand and pure timer transitions. Native
// SQLite/auth identity/AppState delivery/haptics are controlled at their boundary.
jest.mock('../api/client', () => ({ API_BASE_URL: 'http://127.0.0.1:4000/api/v1',
  isCurrentMobileSession: () => true, onMobileSessionInvalidated: () => () => undefined }));
jest.mock('../db/database', () => ({ loadRestTimer: jest.fn(), saveRestTimer: jest.fn() }));
jest.mock('../catalog/catalog', () => ({
  loadExercises: async () => ({ items: [], total: 0, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: null }),
  loadRoutines: async () => ({ items: [], source: 'cache', stale: false, notice: null, updatedAt: null }),
}));
jest.mock('../catalog/thumbnail-files', () => ({ mobileThumbnailCache: {} }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 'success' } }));

const session = { userId: 'rest-user', serverUrl: 'http://127.0.0.1:4000/api/v1', version: 1 };
const workout: LocalWorkout = { clientId: 'rest-screen', revision: 0, name: 'Descanso offline', status: 'ACTIVE',
  startedAt: '2026-10-07T12:00:00Z', notes: null, sets: [], deletedSetClientIds: [] };
let client: QueryClient;
let now: number;
let saved: RestTimerState | null;
let appChange: ((state: AppStateStatus) => void) | null;
const originalAppState = AppState.currentState;
beforeEach(() => {
  now = 1_000_000; saved = null; appChange = null;
  AppState.currentState = 'active';
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    appChange = handler; return { remove: () => { appChange = null; } };
  });
  jest.mocked(loadRestTimer).mockReset().mockImplementation(async () => saved);
  jest.mocked(saveRestTimer).mockReset().mockImplementation(async (_owner, _id, next) => { saved = next; });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useSessionStore.setState({ session, status: 'authenticated' });
  useTrainingStore.setState({ session, ready: true, activeWorkout: workout, localSaveState: 'saved', syncState: 'pending', error: null });
});
afterEach(async () => { await cleanup(); client.clear(); jest.restoreAllMocks(); AppState.currentState = originalAppState; });
const show = () => render(<QueryClientProvider client={client}><TrainScreen /></QueryClientProvider>);
async function press(name: string) { await fireEvent.press(await screen.findByRole('button', { name })); }
async function app(state: AppStateStatus) { await act(async () => { AppState.currentState = state; appChange?.(state); }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

it('starts and durably pauses, adjusts and resumes rest without changing workout source', async () => {
  await show(); await press('Iniciar descanso');
  expect(await screen.findByLabelText('Tiempo de descanso')).toHaveTextContent('02:00');
  now += 31_500;
  await press('Pausar descanso');
  expect(saved).toEqual({ mode: 'PAUSED', remainingMs: 88_500, deadlineMs: null, notificationDelivered: false });
  expect(screen.getByLabelText('Tiempo de descanso')).toHaveTextContent('01:29');
  await press('Añadir 10 segundos');
  expect(saved?.remainingMs).toBe(98_500);
  await press('Restar 10 segundos');
  now = 2_000_000;
  await press('Reanudar descanso');
  expect(saved).toMatchObject({ mode: 'RUNNING', remainingMs: 88_500, deadlineMs: 2_088_500 });
  expect(useTrainingStore.getState().activeWorkout).toEqual(workout);
});

it('prevents duplicate presses and does not claim a pending start is saved', async () => {
  const write = deferred<void>();
  jest.mocked(saveRestTimer).mockImplementation(async (_owner, _id, next) => { await write.promise; saved = next; });
  await show();
  try {
    await press('Iniciar descanso');
    expect(screen.getByText('Guardando descanso…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar descanso' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Pausar descanso' })).toBeNull();
    await press('Iniciar descanso');
    expect(saveRestTimer).toHaveBeenCalledTimes(1);
  } finally { await act(async () => { write.resolve(); }); }
  expect(await screen.findByRole('button', { name: 'Pausar descanso' })).toBeTruthy();
});

it('keeps the durable state after a failed pause and retries its original transition', async () => {
  await show(); await press('Iniciar descanso');
  const original = saved;
  now += 10_000;
  jest.mocked(saveRestTimer).mockRejectedValueOnce(new Error('Disco no disponible.'));
  await press('Pausar descanso');
  expect(await screen.findByRole('alert')).toHaveTextContent(/Disco no disponible/);
  expect(saved).toEqual(original);
  expect(screen.getByRole('button', { name: 'Pausar descanso' })).toBeDisabled();
  await press('Reintentar descanso');
  await waitFor(() => expect(saved?.mode).toBe('PAUSED'));
  expect(saved?.remainingMs).toBe(110_000);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('recovers a paused timer on remount without silently restarting it', async () => {
  saved = { mode: 'PAUSED', remainingMs: 88_500, deadlineMs: null, notificationDelivered: false };
  const view = await show();
  await screen.findByRole('button', { name: 'Reanudar descanso' });
  await view.unmount(); now += 500_000;
  await show();
  expect(await screen.findByLabelText('Tiempo de descanso')).toHaveTextContent('01:29');
  expect(await screen.findByRole('button', { name: 'Reanudar descanso' })).toBeTruthy();
  expect(saveRestTimer).not.toHaveBeenCalled();
});

it('finishes elapsed background time on foreground and emits one durable completion haptic only', async () => {
  await show(); await press('Iniciar descanso');
  await app('background'); now += 180_000;
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  await app('active');
  expect(await screen.findByText('Descanso terminado')).toBeTruthy();
  await waitFor(() => expect(saved?.notificationDelivered).toBe(true));
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  await app('active'); await cleanup(); await show();
  await screen.findByText('Descanso terminado');
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
});

it('never vibrates for a completion whose acknowledgement failed to persist', async () => {
  saved = { mode: 'RUNNING', remainingMs: 120_000, deadlineMs: 999_000, notificationDelivered: false };
  jest.mocked(saveRestTimer).mockRejectedValueOnce(new Error('No se pudo confirmar el descanso.'));
  await show();
  await screen.findByRole('alert');
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  await press('Reintentar descanso');
  await waitFor(() => expect(saved?.notificationDelivered).toBe(true));
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
});

it('shows failed loading and retries without inventing or replacing stored state', async () => {
  jest.mocked(loadRestTimer).mockRejectedValueOnce(new Error('Datos locales dañados.'));
  await show();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Iniciar descanso' })).toBeDisabled();
  expect(saveRestTimer).not.toHaveBeenCalled();
  await press('Reintentar descanso');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar descanso' })).toBeEnabled());
});

it('does not apply a late old-workout load or render timer controls on a terminal workout', async () => {
  const load = deferred<RestTimerState | null>();
  jest.mocked(loadRestTimer).mockImplementationOnce(async () => load.promise);
  await show();
  await act(async () => { useTrainingStore.setState({ activeWorkout: { ...workout, clientId: 'new-workout' } }); });
  await act(async () => { load.resolve({ mode: 'PAUSED', remainingMs: 10_000, deadlineMs: null, notificationDelivered: false }); });
  expect(screen.queryByRole('button', { name: 'Reanudar descanso' })).toBeNull();
  await act(async () => { useTrainingStore.setState({ activeWorkout: { ...workout, status: 'COMPLETED' } }); });
  expect(screen.queryByRole('button', { name: 'Iniciar descanso' })).toBeNull();
});

it('does not vibrate when a completion write returns after its login version changed', async () => {
  saved = { mode: 'RUNNING', remainingMs: 120_000, deadlineMs: 999_000, notificationDelivered: false };
  const write = deferred<void>();
  jest.mocked(saveRestTimer).mockImplementationOnce(async () => write.promise);
  await show();
  await waitFor(() => expect(saveRestTimer).toHaveBeenCalledTimes(1));
  const next = { ...session, version: 2 };
  jest.mocked(loadRestTimer).mockResolvedValue(null);
  await act(async () => { useSessionStore.setState({ session: next }); useTrainingStore.setState({ session: next }); });
  await act(async () => { write.resolve(); });
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('keeps a late old-account completion out of another account and skips background haptics', async () => {
  saved = { mode: 'RUNNING', remainingMs: 120_000, deadlineMs: 999_000, notificationDelivered: false };
  const write = deferred<void>();
  jest.mocked(saveRestTimer).mockImplementationOnce(async () => write.promise);
  await show();
  await waitFor(() => expect(saveRestTimer).toHaveBeenCalledTimes(1));
  const next = { ...session, userId: 'another-account', version: 2 };
  jest.mocked(loadRestTimer).mockResolvedValue(null);
  await act(async () => { useSessionStore.setState({ session: next }); useTrainingStore.setState({ session: next }); });
  await app('background');
  await act(async () => { write.resolve(); });
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(screen.queryByText('Descanso terminado')).toBeNull();
});

it('does not retry optional native haptic failures after remounting acknowledged completion', async () => {
  saved = { mode: 'RUNNING', remainingMs: 120_000, deadlineMs: 999_000, notificationDelivered: false };
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('Native haptics unavailable'));
  await show();
  await screen.findByText('Descanso terminado');
  expect(saved?.notificationDelivered).toBe(true);
  expect(screen.queryByRole('alert')).toBeNull();
  await cleanup(); await show(); await screen.findByText('Descanso terminado');
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
});
