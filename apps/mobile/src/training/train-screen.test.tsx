import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import TrainScreen from '../../app/(tabs)/train';
import HomeScreen from '../../app/(tabs)/index';
import { isCurrentMobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { cachedExerciseGroups, enqueueWorkout, loadActiveWorkout, loadRecoveredDrafts } from '../db/database';
import { loadExercises, loadRoutines, type Exercise } from '../catalog/catalog';
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
  loadRestTimer: async () => null, saveRestTimer: async () => undefined,
  enqueueWorkout: jest.fn(), currentSyncState: jest.fn().mockResolvedValue('pending'),
  loadActiveWorkout: jest.fn().mockResolvedValue(null), getDatabase: jest.fn(),
  syncReviews: async () => [], loadRecoveredDrafts: jest.fn().mockResolvedValue([]),
  cachedExerciseGroups: jest.fn().mockResolvedValue([]),
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
  jest.mocked(Haptics.notificationAsync).mockReset().mockResolvedValue(undefined);
  jest.mocked(Haptics.selectionAsync).mockReset().mockResolvedValue(undefined);
  jest.mocked(enqueueWorkout).mockReset();
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([]);
  jest.mocked(loadActiveWorkout).mockReset().mockResolvedValue(null);
  jest.mocked(cachedExerciseGroups).mockReset().mockResolvedValue([]);
  jest.mocked(isCurrentMobileSession).mockReturnValue(true);
  useSessionStore.setState({ session, status: 'authenticated' });
  useTrainingStore.setState({ session, ready: true, activeWorkout: workout, syncState: 'synced', localSaveState: 'saved', error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => { await cleanup(); client.clear(); });
const show = () => render(<QueryClientProvider client={client}><TrainScreen /></QueryClientProvider>);

// Owner-authorized local Windows cold native-render allowance; CI and subsequent
// cases keep their existing deadlines. This is not the release startup budget.
it('exposes nullable duration and RPE with warmup and three-state technique', async () => {
  useTrainingStore.setState({ activeWorkout: { ...workout, sets: [{ ...workout.sets[0], durationS: null, rpe: null, techniqueStable: null }] } });
  await show();
  expect(screen.getByLabelText('Duración segundos')).toHaveDisplayValue('');
  expect(screen.getByLabelText('RPE')).toHaveDisplayValue('');
  expect(screen.getByRole('checkbox', { name: 'Serie de calentamiento' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Técnica sin registrar' })).toBeChecked();
}, process.platform === 'win32' && !process.env.CI ? 30_000 : 10_000);

it('persists an added set even when optional selection vibration rejects', async () => {
  const exercise: Exercise = { id: 'screen-exercise', sourceId: null, name: 'Press sintético', muscleGroup: 'CHEST', equipment: 'BARBELL',
    category: null, imagePath: null, gifPath: null, target: null, bodyPart: null, secondaryMuscles: [], equipmentLabel: null,
    isCustom: false, ownerId: null, isCompound: true, tags: [], description: null, mediaId: null, attribution: null, imageUrl: null, gifUrl: null };
  jest.mocked(loadExercises).mockResolvedValueOnce({ items: [exercise], total: 1, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' });
  jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Vibración al agregar no disponible'));
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
    return 'pending';
  });
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: 'Agregar serie' }));
  await waitFor(() => expect(useTrainingStore.getState().localSaveState).toBe('saved'));
  expect(useTrainingStore.getState().activeWorkout?.sets).toHaveLength(2);
  expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)![3].sets[1]).toMatchObject({ exerciseId: 'screen-exercise' });
});

it('lets a saved routine select an exercise even when it is not in the current catalog page', async () => {
  useTrainingStore.setState({ activeWorkout: { ...workout, routineId: 'routine-1', sets: [] } });
  jest.mocked(loadRoutines).mockResolvedValueOnce({
    items: [{ id: 'routine-1', userId: session.userId, name: 'Piernas', dayOfWeek: null, notes: null,
      createdAt: '2026-08-30T10:00:00Z', updatedAt: '2026-08-30T10:00:00Z', exercises: [{
        id: 'routine-exercise-1', routineId: 'routine-1', exerciseId: 'exercise-1', order: 0,
        targetSets: 3, targetReps: 8, targetWeightKg: null, seriesPlan: null, notes: null,
        exercise: { id: 'exercise-1', sourceId: null, name: 'Sentadilla', muscleGroup: 'QUADS', equipment: 'BARBELL',
          category: null, imagePath: null, gifPath: null, target: null, bodyPart: null, secondaryMuscles: [],
          equipmentLabel: null, isCustom: false, ownerId: null, isCompound: true, tags: [], description: null,
          mediaId: null, attribution: null, instructions: null, instructionSteps: null, createdAt: '2026-08-30T10:00:00Z' },
      }] }], source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z',
  });
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: 'Seleccionar Sentadilla de la rutina' }));
  expect(screen.getByRole('button', { name: 'Agregar serie' })).toBeTruthy();
  expect(useTrainingStore.getState().activeWorkout?.sets).toHaveLength(0);
});

it('shows recorded muscle work from the current exercise without inventing secondary muscles', async () => {
  useTrainingStore.setState({ activeWorkout: { ...workout, sets: [{ ...workout.sets[0], reps: null }] } });
  const exercise: Exercise = { id: 'screen-exercise', sourceId: null, name: 'Press sintético', muscleGroup: 'CHEST', equipment: 'BARBELL',
    category: null, imagePath: null, gifPath: null, target: null, bodyPart: null, secondaryMuscles: ['triceps'], equipmentLabel: null,
    isCustom: false, ownerId: null, isCompound: true, tags: [], description: null, mediaId: null, attribution: null, imageUrl: null, gifUrl: null };
  jest.mocked(loadExercises).mockResolvedValueOnce({ items: [exercise], total: 1, page: 1, limit: 30, hasMore: false,
    source: 'cache', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' });
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
    return 'pending';
  });
  await show();
  expect(screen.queryByText('Mapa muscular')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Repeticiones'), '8');
  expect(await screen.findByText('Pecho · 1 serie')).toBeTruthy();
  expect(screen.getByText('Mapa muscular')).toBeTruthy();
  expect(screen.queryByText(/Tríceps ·/)).toBeNull();
});

it('uses the owner-scoped exercise cache when the recorded exercise is on another page', async () => {
  jest.mocked(cachedExerciseGroups).mockResolvedValue([{ id: 'screen-exercise', muscleGroup: 'CHEST' }]);
  await show();
  expect(await screen.findByText('Pecho · 1 serie')).toBeTruthy();
  expect(jest.mocked(cachedExerciseGroups)).toHaveBeenCalledWith(session, ['screen-exercise']);
});

it('finishes the durable workout without waiting for optional native confirmation', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  jest.mocked(Haptics.notificationAsync).mockReturnValueOnce(pending);
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved.status === 'ACTIVE' ? saved : null);
    return 'pending';
  });
  let pressing: Promise<void> | undefined;
  try {
    await show();
    let finishedHandler = false;
    pressing = fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' })).then(() => { finishedHandler = true; });
    await waitFor(() => expect(finishedHandler).toBe(true));
    expect(useTrainingStore.getState().activeWorkout).toBeNull();
    expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)![3].status).toBe('COMPLETED');
  } finally {
    await act(async () => { release(); await pressing; });
  }
});

it('edits all native set fields into the durable source and sync payload', async () => {
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
    return 'pending';
  });
  await show();
  await fireEvent.changeText(screen.getByLabelText('Duración segundos'), '45');
  await fireEvent.changeText(screen.getByLabelText('RPE'), '8');
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Serie de calentamiento' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Técnica inestable' }));
  await waitFor(() => expect(useTrainingStore.getState().localSaveState).toBe('saved'));
  expect(useTrainingStore.getState().activeWorkout?.sets[0]).toMatchObject({
    durationS: 45, rpe: 8, isWarmup: true, techniqueStable: false, weightKg: 50, reps: 8,
  });
  const lastPayload = jest.mocked(enqueueWorkout).mock.calls.at(-1)![3];
  expect(lastPayload.sets[0]).toMatchObject({ durationS: 45, rpe: 8, isWarmup: true, techniqueStable: false });
});

it.each(['abc', '-1', '2001'])('does not persist invalid weight %s as zero or an out-of-range value', async text => {
  await show();
  await fireEvent.changeText(screen.getByLabelText('Peso kg'), text);
  expect(screen.getByRole('alert')).toHaveTextContent(/Peso kg/);
  expect(screen.getByLabelText('Peso kg')).toHaveDisplayValue(text);
  expect(useTrainingStore.getState().activeWorkout?.sets[0].weightKg).toBe(50);
});

it('clears nullable numeric fields without inventing zero', async () => {
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
    return 'pending';
  });
  await show();
  await fireEvent.changeText(screen.getByLabelText('Peso kg'), '');
  await waitFor(() => expect(useTrainingStore.getState().activeWorkout?.sets[0].weightKg).toBeNull());
  expect(screen.getByLabelText('Peso kg')).toHaveDisplayValue('');
});

it.each([
  ['RPE', 'rpe', '0', 7], ['RPE', 'rpe', '11', 7], ['RPE', 'rpe', '1.5', 7],
  ['Duración segundos', 'durationS', '1.5', null], ['Duración segundos', 'durationS', '86401', null],
  ['Repeticiones', 'reps', '0.5', 8], ['Repeticiones', 'reps', '1001', 8],
] as const)('rejects %s input %s without changing its source', async (label, field, text, unchanged) => {
  await show();
  await fireEvent.changeText(screen.getByLabelText(label), text);
  expect(screen.getByRole('alert')).toHaveTextContent(new RegExp(label));
  expect(useTrainingStore.getState().activeWorkout?.sets[0][field]).toBe(unchanged);
});

it('keeps optional fields and flags read-only during terminal persistence', async () => {
  useTrainingStore.setState({ activeWorkout: { ...workout, status: 'COMPLETED' } });
  await show();
  expect(screen.getByLabelText('Duración segundos')).toBeDisabled();
  expect(screen.getByLabelText('RPE')).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Serie de calentamiento' })).toBeDisabled();
  const technique = screen.getByRole('radio', { name: 'Técnica inestable' });
  expect(technique).toBeDisabled();
  await fireEvent.press(technique);
  expect(useTrainingStore.getState().activeWorkout?.sets[0].techniqueStable).toBe(true);
});

it('accepts comma decimals and clears RPE and technique without converting absence to zero', async () => {
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved);
    return 'pending';
  });
  await show();
  await fireEvent.changeText(screen.getByLabelText('Peso kg'), '50,5');
  await fireEvent.changeText(screen.getByLabelText('RPE'), '');
  await fireEvent.press(screen.getByRole('radio', { name: 'Técnica sin registrar' }));
  await waitFor(() => expect(useTrainingStore.getState().localSaveState).toBe('saved'));
  expect(useTrainingStore.getState().activeWorkout?.sets[0]).toMatchObject({ weightKg: 50.5, rpe: null, techniqueStable: null });
  expect(screen.getByLabelText('RPE')).toHaveDisplayValue('');
});

it('completes a duration-only session using native controls and keeps null reps in the outbox', async () => {
  useTrainingStore.setState({ activeWorkout: { ...workout, sets: [{ ...workout.sets[0], weightKg: null, reps: null, rpe: null }] } });
  jest.mocked(enqueueWorkout).mockImplementation(async (_owner, saved) => {
    jest.mocked(loadActiveWorkout).mockResolvedValue(saved.status === 'ACTIVE' ? saved : null);
    return 'pending';
  });
  await show();
  await fireEvent.changeText(screen.getByLabelText('Duración segundos'), '60');
  await waitFor(() => expect(useTrainingStore.getState().localSaveState).toBe('saved'));
  await fireEvent.press(screen.getByRole('button', { name: 'Finalizar y sincronizar' }));
  expect(useTrainingStore.getState().activeWorkout).toBeNull();
  expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)![3]).toMatchObject({ status: 'COMPLETED',
    sets: [{ durationS: 60, weightKg: null, reps: null, rpe: null }] });
});

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
