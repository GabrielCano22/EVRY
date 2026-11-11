import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import HomeScreen from '../../app/(tabs)/index';
import { isCurrentMobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { enqueueWorkout, loadActiveWorkout, loadRecoveredDrafts } from '../db/database';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

// Home owns navigation and recovery. Native storage, transport and haptics are
// replaced at their boundary; the screen, Zustand store and query observers run
// unchanged.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'screen-sync-id' }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined), selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
jest.mock('../api/client', () => ({
  API_BASE_URL: 'http://127.0.0.1:4000/api/v1', isCurrentMobileSession: jest.fn(() => true),
  onMobileSessionInvalidated: () => () => undefined,
}));
jest.mock('../db/database', () => ({
  loadRestTimer: async () => null, saveRestTimer: async () => undefined,
  enqueueWorkout: jest.fn(), currentSyncState: jest.fn().mockResolvedValue('pending'),
  loadActiveWorkout: jest.fn().mockResolvedValue(null), getDatabase: jest.fn(),
  syncReviews: async () => [], loadRecoveredDrafts: jest.fn().mockResolvedValue([]),
  cachedExerciseGroups: jest.fn().mockResolvedValue([]), cachedExerciseSummaries: jest.fn().mockResolvedValue([]),
}));
jest.mock('../sync/sync-engine', () => ({ syncPendingWorkouts: async () => undefined }));
jest.mock('../catalog/catalog', () => ({
  loadExercises: jest.fn(async () => ({ items: [], total: 0, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' })),
  loadRoutines: jest.fn(async () => ({ items: [], source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' })),
}));
jest.mock('../catalog/thumbnail-files', () => ({ mobileThumbnailCache: { resolve: async (_owner: unknown, url: string) => url } }));

const session = { userId: 'screen-user', serverUrl: 'http://127.0.0.1:4000/api/v1', version: 1 };
const workout: LocalWorkout = {
  clientId: 'screen-workout', name: 'Fuerza guardada', revision: 2, status: 'ACTIVE', notes: null,
  startedAt: '2026-08-30T10:00:00Z', deletedSetClientIds: [],
  sets: [{ clientId: 'screen-set', revision: 0, exerciseId: 'screen-exercise', order: 0,
    weightKg: 50, reps: 8, durationS: null, rpe: 7, isWarmup: false, techniqueStable: true,
    completedAt: '2026-08-30T10:05:00Z' }],
};
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(enqueueWorkout).mockReset();
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([]);
  jest.mocked(loadActiveWorkout).mockReset().mockResolvedValue(null);
  jest.mocked(isCurrentMobileSession).mockReturnValue(true);
  useSessionStore.setState({ session, status: 'authenticated' });
  useTrainingStore.setState({ session, ready: true, activeWorkout: workout, syncState: 'synced', localSaveState: 'saved', error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => { await cleanup(); client.clear(); });

async function showHome() {
  await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

it.each(['account', 'version'] as const)('does not navigate after a Home start finishes for a superseded %s', async (change) => {
  useTrainingStore.setState({ activeWorkout: null });
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await showHome();
  const pressing = fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await waitFor(() => expect(release).toBeDefined());
  const next = { ...session, userId: change === 'account' ? 'another-user' : session.userId, version: 2 };
  await act(async () => {
    useSessionStore.setState({ session: next });
    useTrainingStore.getState().reset();
    jest.mocked(isCurrentMobileSession).mockImplementation(owner => owner === next);
    release('pending');
    await pressing;
  });
  expect(router.push).not.toHaveBeenCalled();
  expect(useTrainingStore.getState().activeWorkout).toBeNull();
});

it('does not navigate when Home starts before local initialization is ready', async () => {
  useTrainingStore.setState({ activeWorkout: null, ready: false });
  await showHome();
  await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(router.push).not.toHaveBeenCalled();
  expect(useTrainingStore.getState().activeWorkout).toBeNull();
});

it('consumes a failed Home start and keeps the local-save error visible without navigation', async () => {
  useTrainingStore.setState({ activeWorkout: null });
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  await showHome();
  await expect(fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }))).resolves.toBeUndefined();
  expect(screen.getByRole('alert')).toHaveTextContent('SQLite sin espacio');
  expect(screen.getByText('No se pudo guardar el último cambio')).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
});

it('navigates after a same-session Home start is saved, never before persistence', async () => {
  useTrainingStore.setState({ activeWorkout: null });
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await showHome();
  const pressing = fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await waitFor(() => expect(release).toBeDefined());
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
  await act(async () => { release('pending'); await pressing; });
  expect(router.push).toHaveBeenCalledWith('/train');
  expect(screen.getByText('Guardado localmente')).toBeTruthy();
});

it('does not navigate when a recovered Home draft finishes after the account changes', async () => {
  useTrainingStore.setState({ activeWorkout: null });
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([{ ...workout, status: 'DRAFT' }]);
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await showHome();
  await screen.findByRole('button', { name: 'Recuperar como nueva sesión' });
  const pressing = fireEvent.press(screen.getByRole('button', { name: 'Recuperar como nueva sesión' }));
  await waitFor(() => expect(release).toBeDefined());
  const next = { ...session, userId: 'another-user', version: 2 };
  await act(async () => {
    useSessionStore.setState({ session: next });
    useTrainingStore.getState().reset();
    jest.mocked(isCurrentMobileSession).mockImplementation(owner => owner === next);
    release('pending');
    await pressing;
  });
  await waitFor(() => expect(useTrainingStore.getState().activeWorkout).toBeNull());
  expect(router.push).not.toHaveBeenCalled();
});

it('navigates after a same-session Home draft is recovered durably', async () => {
  useTrainingStore.setState({ activeWorkout: null });
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([{ ...workout, status: 'DRAFT' }]);
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce((_owner, saved) => new Promise(resolve => {
    release = state => {
      // Mirror native persistence: the sync refresh must read the saved session.
      jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
      resolve(state);
    };
  }));
  await showHome();
  const recoverButton = await screen.findByRole('button', { name: 'Recuperar como nueva sesión' });
  await fireEvent.press(recoverButton);
  await waitFor(() => expect(release).toBeDefined());
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
  await act(async () => { release('pending'); });
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/train'));
  expect(screen.getByText('Guardado localmente')).toBeTruthy();
  expect(useTrainingStore.getState().activeWorkout?.sets[0].reps).toBe(8);
});

it.each(['start', 'recover'] as const)('does not let a second Home press bypass a pending %s write', async operation => {
  useTrainingStore.setState({ activeWorkout: null });
  if (operation === 'recover') jest.mocked(loadRecoveredDrafts).mockResolvedValue([{ ...workout, status: 'DRAFT' }]);
  await showHome();
  const startButton = await screen.findByRole('button', {
    name: operation === 'recover' ? 'Recuperar como nueva sesión' : 'Iniciar sesión',
  });
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce((_owner, saved) => new Promise(resolve => {
    release = state => { jest.mocked(loadActiveWorkout).mockResolvedValue(saved); resolve(state); };
  }));
  const pressing = fireEvent.press(startButton);
  try {
    await waitFor(() => expect(release).toBeDefined());
    const continueButton = await screen.findByRole('button', { name: 'Continuar sesión' });
    await fireEvent.press(continueButton);
    expect(router.push).not.toHaveBeenCalled();
    expect(continueButton).toBeDisabled();
  } finally {
    await act(async () => { release('pending'); await pressing; });
  }
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/train'));
});

it('keeps the saved Home session available to retry after a failed local edit', async () => {
  useTrainingStore.setState({ localSaveState: 'failed', error: 'SQLite sin espacio' });
  await showHome();
  const continueButton = screen.getByRole('button', { name: 'Continuar sesión' });
  expect(continueButton).toBeEnabled();
  await fireEvent.press(continueButton);
  expect(router.push).toHaveBeenCalledWith('/train');
  expect(screen.getByRole('alert')).toHaveTextContent('SQLite sin espacio');
});

it('does not describe optimistic series as locally saved on Home', async () => {
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
  let editing!: Promise<void>;
  await act(async () => { editing = useTrainingStore.getState().updateSet('screen-set', { reps: 9 }); });
  try {
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
    expect(screen.queryByText(/series guardadas localmente/)).toBeNull();
  } finally {
    await act(async () => { release('pending'); await editing; });
  }
  expect(screen.getByText('Guardado localmente')).toBeTruthy();
});
