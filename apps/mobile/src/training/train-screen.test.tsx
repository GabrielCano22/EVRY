import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import TrainScreen from '../../app/(tabs)/train';
import HomeScreen from '../../app/(tabs)/index';
import { isCurrentMobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { enqueueWorkout, loadActiveWorkout } from '../db/database';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

// Native storage/network/haptics are unavailable in Node. Keep the screen,
// query observers, Zustand state and completion/rollback implementation real.
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
  enqueueWorkout: jest.fn(), currentSyncState: jest.fn().mockResolvedValue('pending'),
  loadActiveWorkout: jest.fn().mockResolvedValue(null), getDatabase: jest.fn(),
  syncReviews: async () => [], loadRecoveredDrafts: async () => [],
}));
jest.mock('../sync/sync-engine', () => ({ syncPendingWorkouts: async () => undefined }));
jest.mock('../catalog/catalog', () => ({
  loadExercises: async () => ({ items: [], total: 0, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' }),
  loadRoutines: async () => ({ items: [], source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' }),
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
  jest.mocked(isCurrentMobileSession).mockReturnValue(true);
  useSessionStore.setState({ session, status: 'authenticated' });
  useTrainingStore.setState({ session, ready: true, activeWorkout: workout, syncState: 'synced', localSaveState: 'saved', error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => { await cleanup(); client.clear(); });
const show = () => render(<QueryClientProvider client={client}><TrainScreen /></QueryClientProvider>);

it('shows saving rather than durable success while completing, then releases the session', async () => {
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await show();
  const pressing = fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' }));
  try {
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.getByText('Finalizando sesión…')).toBeTruthy();
    expect(screen.queryByText('Guardado localmente')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión libre' })).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  } finally {
    await act(async () => { release('pending'); await pressing; });
  }
  await waitFor(() => expect(screen.getByText('No hay una sesión activa.')).toBeTruthy());
  expect(screen.getByText('Guardado localmente')).toBeTruthy();
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

it('handles failed completion without dropping the active session or emitting success feedback', async () => {
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('SQLite sin espacio'));
  expect(screen.getByLabelText('Repeticiones')).toHaveDisplayValue('8');
  expect(screen.getByText('Fuerza guardada')).toBeTruthy();
  expect(screen.queryByText('No hay una sesión activa.')).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('does not emit success feedback when the session expires during persistence', async () => {
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await show();
  const pressing = fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' }));
  try {
    await waitFor(() => expect(release).toBeDefined());
    jest.mocked(isCurrentMobileSession).mockReturnValue(false);
  } finally {
    await act(async () => { release('pending'); await pressing; });
  }
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('does not undo a durable completion if optional haptic feedback fails', async () => {
  jest.mocked(enqueueWorkout).mockResolvedValueOnce('pending');
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('Haptics unavailable'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' }));
  await waitFor(() => expect(screen.getByText('No hay una sesión activa.')).toBeTruthy());
  expect(screen.getByText('Guardado localmente')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps saving visible until the newest queued edit is durable', async () => {
  let first!: (state: 'pending') => void;
  let second!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout)
    .mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
  await show();
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '9');
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '10');
  try {
    await waitFor(() => expect(first).toBeDefined());
    expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
    expect(screen.queryByText('Guardado localmente')).toBeNull();
    await act(async () => { first('pending'); });
    await waitFor(() => expect(second).toBeDefined());
    expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
    expect(screen.getByLabelText('Repeticiones')).toHaveDisplayValue('10');
  } finally {
    first('pending');
    await waitFor(() => expect(second).toBeDefined());
    await act(async () => { second('pending'); });
  }
  await waitFor(() => expect(screen.getByText('Guardado localmente')).toBeTruthy());
});

it('does not label failed local edits as saved', async () => {
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
  await show();
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '9');
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('SQLite sin espacio'));
  expect(screen.getByLabelText('Repeticiones')).toHaveDisplayValue('8');
  expect(screen.getByText('No se pudo guardar el último cambio')).toBeTruthy();
  expect(screen.queryByText('Guardado localmente')).toBeNull();
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

it('keeps a reinitializing account locked until its previous local write settles', async () => {
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
  await show();
  let editing!: Promise<void>;
  let initializing!: Promise<void>;
  await act(async () => { editing = useTrainingStore.getState().updateSet('screen-set', { reps: 9 }); });
  try {
    await waitFor(() => expect(release).toBeDefined());
    await act(async () => { initializing = useTrainingStore.getState().initialize(session); });
    expect(useTrainingStore.getState().ready).toBe(false);
    expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
    expect(screen.queryByText('Guardado localmente')).toBeNull();
  } finally {
    await act(async () => { release('pending'); await Promise.all([editing, initializing]); });
  }
  expect(useTrainingStore.getState().ready).toBe(true);
});

it('clears a failed-save indication only after a successful retry', async () => {
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
  await show();
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '9');
  await waitFor(() => expect(screen.getByText('No se pudo guardar el último cambio')).toBeTruthy());
  let release!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '9');
  try {
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
    expect(screen.queryByText('Guardado localmente')).toBeNull();
  } finally {
    await act(async () => { release('pending'); });
  }
  await waitFor(() => expect(screen.getByText('Guardado localmente')).toBeTruthy());
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each(['start', 'recover', 'add', 'delete', 'cancel'] as const)(
  'does not declare %s durable before its write resolves', async (operation) => {
    let release!: (state: 'pending') => void;
    jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    if (operation === 'start' || operation === 'recover') useTrainingStore.setState({ activeWorkout: null });
    await show();
    let writing!: Promise<void>;
    await act(async () => {
      const store = useTrainingStore.getState();
      if (operation === 'start') writing = store.startWorkout('Nueva sesión');
      if (operation === 'recover') writing = store.recoverDraft({ ...workout, status: 'DRAFT' });
      if (operation === 'add') writing = store.addSet('another-exercise');
      if (operation === 'delete') writing = store.deleteSet('screen-set');
      if (operation === 'cancel') writing = store.cancelWorkout();
    });
    try {
      await waitFor(() => expect(release).toBeDefined());
      expect(screen.getByText('Guardando en este dispositivo…')).toBeTruthy();
      expect(screen.queryByText('Guardado localmente')).toBeNull();
      expect(screen.queryByText('Sincronizado')).toBeNull();
    } finally {
      await act(async () => { release('pending'); await writing; });
    }
    await waitFor(() => expect(screen.getByText('Guardado localmente')).toBeTruthy());
  },
);

it.each(['finishWorkout', 'cancelWorkout'] as const)(
  'unlocks initialization after a pending %s settles', async (operation) => {
    let release!: (state: 'pending') => void;
    jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    jest.mocked(loadActiveWorkout).mockResolvedValueOnce(null);
    await show();
    let writing!: Promise<void>;
    let initializing!: Promise<void>;
    await act(async () => { writing = useTrainingStore.getState()[operation](); });
    try {
      await waitFor(() => expect(release).toBeDefined());
      await act(async () => { initializing = useTrainingStore.getState().initialize(session); });
      expect(useTrainingStore.getState().ready).toBe(false);
    } finally {
      await act(async () => { release('pending'); await Promise.all([writing, initializing]); });
    }
    expect(useTrainingStore.getState().ready).toBe(true);
    expect(screen.getByText('No hay una sesión activa.')).toBeTruthy();
    expect(screen.queryByText('Guardando en este dispositivo…')).toBeNull();
  },
);

it.each(['finishWorkout', 'cancelWorkout'] as const)(
  'restores readiness after a pending %s fails during initialization', async (operation) => {
    let reject!: (reason: Error) => void;
    jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
    await show();
    let writing!: Promise<void>;
    let initializing!: Promise<void>;
    await act(async () => { writing = useTrainingStore.getState()[operation](); });
    try {
      await waitFor(() => expect(reject).toBeDefined());
      await act(async () => { initializing = useTrainingStore.getState().initialize(session); });
      expect(useTrainingStore.getState().ready).toBe(false);
    } finally {
      await act(async () => { reject(new Error('SQLite sin espacio')); await Promise.allSettled([writing, initializing]); });
    }
    expect(useTrainingStore.getState().ready).toBe(true);
    expect(screen.getByText('Fuerza guardada')).toBeTruthy();
    expect(screen.getByLabelText('Repeticiones')).toHaveDisplayValue('8');
    expect(screen.getByRole('alert')).toHaveTextContent('SQLite sin espacio');
    expect(screen.getByText('No se pudo guardar el último cambio')).toBeTruthy();
  },
);
