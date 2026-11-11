import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import TrainScreen from '../../app/(tabs)/train';
import { saveRestPreferences, saveRestTimer } from '../db/database';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from './training-store';
import { useRestPreferencesStore } from './rest-preferences-store';
import type { LocalWorkout } from './workout-domain';

// Native storage, transport and haptics are replaced at their boundary. The
// screen, the training store, the rest timer and every sheet stay real.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'generated-set' }));
jest.mock('@/src/api/client', () => ({
  API_BASE_URL: 'https://example.test/api/v1',
  isCurrentMobileSession: () => true,
  onMobileSessionInvalidated: () => () => undefined,
  withMobileAuth: (run: (client: unknown) => unknown) => run({
    GET: jest.fn(async () => ({ error: { message: 'Sin conexión' } })),
  }),
}));
jest.mock('@/src/routines/RoutineManager', () => ({ RoutineManager: () => null }));
jest.mock('@/src/catalog/thumbnail-files', () => ({
  mobileThumbnailCache: { resolve: async (_owner: unknown, url: string) => url },
}));
jest.mock('@/src/catalog/catalog', () => ({
  loadExercises: jest.fn(async () => ({
    items: [], total: 0, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: '2026-11-08T10:00:00.000Z',
  })),
  loadRoutines: jest.fn(async () => ({
    items: [], source: 'cache', stale: false, notice: null, updatedAt: '2026-11-08T10:00:00.000Z',
  })),
}));
jest.mock('@/src/sync/sync-engine', () => ({ syncPendingWorkouts: async () => undefined }));
jest.mock('@/src/db/database', () => ({
  enqueueWorkout: jest.fn(async () => 'pending'),
  currentSyncState: jest.fn(async () => 'synced'),
  getDatabase: jest.fn(),
  // Emulate native storage: a sync refresh must read back what was just saved.
  loadActiveWorkout: jest.fn(async () => jest.requireActual<typeof import('./training-store')>('./training-store')
    .useTrainingStore.getState().activeWorkout),
  cachedExerciseSummaries: jest.fn(async () => [{
    id: 'squat', name: 'Sentadilla', muscleGroup: 'QUADS', category: null,
    imageUrl: null, imagePath: null,
  }]),
  loadUiPreference: jest.fn(async () => null),
  saveUiPreference: jest.fn(async () => undefined),
  loadRestTimer: jest.fn(async () => null),
  saveRestTimer: jest.fn(async () => undefined),
  loadRestPreferences: jest.fn(async () => ({ defaultRestSeconds: 120, restSecondsByExerciseId: {} })),
  saveRestPreferences: jest.fn(async () => undefined),
}));

const session = { userId: 'train-user', serverUrl: 'https://example.test/api/v1', version: 1 };
const startedAt = new Date().toISOString();
const workout: LocalWorkout = {
  clientId: 'workout-1', name: 'Piernas', revision: 1, status: 'ACTIVE', notes: null, startedAt,
  deletedSetClientIds: [],
  sets: [
    { clientId: 'warm-set', exerciseId: 'squat', order: 0, setType: 'WARMUP', isWarmup: true,
      weightKg: 20, reps: 10, durationS: null, rpe: null, techniqueStable: null, completedAt: null, revision: 0 },
    { clientId: 'work-set', exerciseId: 'squat', order: 1, setType: 'NORMAL', isWarmup: false,
      weightKg: 50, reps: 8, durationS: null, rpe: null, techniqueStable: null, completedAt: null, revision: 0 },
  ],
};

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(saveRestTimer).mockResolvedValue(undefined);
  jest.mocked(saveRestPreferences).mockResolvedValue(undefined);
  useSessionStore.setState({
    session, status: 'authenticated', user: { biologicalSex: 'FEMALE' } as never,
  });
  useTrainingStore.setState({
    session, ready: true, activeWorkout: workout, syncState: 'synced', localSaveState: 'saved', error: null,
  });
  useRestPreferencesStore.setState({
    session, ready: true, saving: false, error: null,
    preferences: { defaultRestSeconds: 120, restSecondsByExerciseId: {} },
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

async function show() {
  await render(<QueryClientProvider client={client}><TrainScreen /></QueryClientProvider>);
  // The card name comes from the owner-scoped exercise cache, which is a
  // second async query; wait for it so later labels never use the fallback.
  await screen.findByText('Sentadilla');
  await screen.findByLabelText('Serie 1: pendiente');
}

function currentSets() {
  return useTrainingStore.getState().activeWorkout?.sets ?? [];
}

it('shows the session, its metrics and the real state of every set', async () => {
  await show();
  expect(screen.getByText('Piernas')).toBeTruthy();
  expect(screen.getByText('Sentadilla')).toBeTruthy();
  expect(screen.getByText('Volumen')).toBeTruthy();
  expect(screen.getByText('0 kg')).toBeTruthy();
  expect(screen.getByLabelText('Serie W')).toBeTruthy();
  expect(screen.getByLabelText('Serie 1: pendiente')).toBeTruthy();
  expect(screen.getByLabelText('Tipo de serie: Calentamiento')).toBeTruthy();
  expect(screen.getByLabelText('Tipo de serie: Normal')).toBeTruthy();
  expect(screen.getByLabelText('Peso de la serie 1 en kilos').props.value).toBe('50');
});

it('starts the configured rest only after the set is durably completed', async () => {
  await show();
  await act(async () => { await fireEvent.press(screen.getByLabelText('Serie 1: pendiente')); });

  await waitFor(() => expect(currentSets()[1].completedAt).not.toBeNull());
  expect(screen.getByLabelText('Serie 1: completada')).toBeTruthy();
  expect(await screen.findByText('400 kg')).toBeTruthy();
  await waitFor(() => expect(saveRestTimer).toHaveBeenCalledWith(
    session, 'workout-1', expect.objectContaining({ mode: 'RUNNING', remainingMs: 120_000 }),
  ));
  expect(screen.getByText('Descanso')).toBeTruthy();
});

it('gives warm-up sets half of the configured rest', async () => {
  await show();
  await act(async () => { await fireEvent.press(screen.getByLabelText('Serie W: pendiente')); });

  await waitFor(() => expect(saveRestTimer).toHaveBeenCalledWith(
    session, 'workout-1', expect.objectContaining({ mode: 'RUNNING', remainingMs: 60_000 }),
  ));
  expect(await screen.findByText('Calentamiento · descanso corto')).toBeTruthy();
  // A warm-up never adds volume.
  expect(screen.getByText('0 kg')).toBeTruthy();
});

it('changes the type from the sheet and keeps isWarmup derived', async () => {
  await show();
  await fireEvent.press(screen.getByLabelText('Tipo de serie: Normal'));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Calentamiento. No cuenta para el volumen' }));

  await waitFor(() => expect(currentSets()[1].setType).toBe('WARMUP'));
  expect(currentSets()[1].isWarmup).toBe(true);
});

it('edits and persists the rest of one exercise without touching the default', async () => {
  await show();
  await fireEvent.press(screen.getByLabelText('Descanso de Sentadilla: 02:00, corto 01:00'));
  expect(await screen.findByText('Descanso · Sentadilla')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Añadir quince segundos'));
  await fireEvent.press(screen.getByLabelText('Añadir quince segundos'));
  expect(screen.getByLabelText('Descanso configurado')).toHaveTextContent('02:30');
  await act(async () => { await fireEvent.press(screen.getByText('Guardar descanso')); });

  await waitFor(() => expect(saveRestPreferences).toHaveBeenCalledWith(session,
    { defaultRestSeconds: 120, restSecondsByExerciseId: { squat: 150 } }));
  expect(await screen.findByLabelText('Descanso de Sentadilla: 02:30, corto 01:15')).toBeTruthy();
});

it('adds a set that copies the previous values and the sticky type', async () => {
  await show();
  await act(async () => { await fireEvent.press(screen.getByLabelText('Agregar serie')); });

  await waitFor(() => expect(currentSets()).toHaveLength(3));
  expect(currentSets()[2]).toMatchObject({ weightKg: 50, reps: 8, setType: 'NORMAL', completedAt: null });
});

it('records RPE and technique in the per-set options sheet', async () => {
  await show();
  await fireEvent.press(screen.getByLabelText('Opciones de la serie 1'));
  await fireEvent.press(await screen.findByLabelText('RPE 8'));
  await waitFor(() => expect(currentSets()[1].rpe).toBe(8));
  await fireEvent.press(screen.getByLabelText('Técnica Inestable'));
  await waitFor(() => expect(currentSets()[1].techniqueStable).toBe(false));

  await act(async () => { await fireEvent.press(screen.getByText('Eliminar serie')); });
  await waitFor(() => expect(currentSets()).toHaveLength(1));
});

it('refuses to finish without a useful completed set and then asks about pending ones', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    await show();
    await fireEvent.press(screen.getByLabelText('Terminar'));
    expect(alert).toHaveBeenLastCalledWith('Marca una serie', expect.stringMatching(/al menos una serie completada/));

    await act(async () => { await fireEvent.press(screen.getByLabelText('Serie 1: pendiente')); });
    await waitFor(() => expect(currentSets()[1].completedAt).not.toBeNull());
    await fireEvent.press(screen.getByLabelText('Terminar'));
    expect(alert).toHaveBeenLastCalledWith(
      'Terminar sesión',
      'Hay 1 serie sin completar. ¿Terminar de todos modos?',
      expect.any(Array),
    );

    const buttons = alert.mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
    await act(async () => { buttons.find((button) => button.text === 'Terminar')?.onPress?.(); });
    await waitFor(() => expect(useTrainingStore.getState().activeWorkout).toBeNull());
    expect(await screen.findByText('No hay una sesión activa.')).toBeTruthy();
  } finally {
    alert.mockRestore();
  }
});
