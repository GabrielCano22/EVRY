import { waitFor } from '@testing-library/react-native';
import { enqueueWorkout, loadActiveWorkout } from '../db/database';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-sync-id' }));
jest.mock('../db/database', () => ({
  enqueueWorkout: jest.fn().mockResolvedValue('pending'),
  currentSyncState: jest.fn().mockResolvedValue('pending'),
  loadActiveWorkout: jest.fn().mockResolvedValue(null),
  archiveRecoveredDraft: jest.fn(), getDatabase: jest.fn(),
}));
jest.mock('../sync/sync-engine', () => ({ syncPendingWorkouts: async () => undefined }));
jest.mock('../api/client', () => ({ isCurrentMobileSession: () => true, onMobileSessionInvalidated: () => () => undefined }));

it('sends a tombstone when a locally unacknowledged set is removed during a request', async () => {
  const workout: LocalWorkout = {
    clientId: 'workout-1', name: 'Fuerza', revision: 0, status: 'ACTIVE', notes: null,
    startedAt: '2026-08-30T10:00:00.000Z', deletedSetClientIds: [],
    sets: [{
      clientId: 'set-in-flight', revision: 0, exerciseId: 'exercise-1', order: 0,
      reps: 8, weightKg: 50, durationS: null, rpe: null, isWarmup: false,
      techniqueStable: null, completedAt: '2026-08-30T10:05:00.000Z',
    }],
  };
  useTrainingStore.setState({ activeWorkout: workout, ready: true, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });
  await useTrainingStore.getState().deleteSet('set-in-flight');
  expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)?.[3]).toMatchObject({
    sets: [], deletedSetClientIds: ['set-in-flight'],
  });
});

it('keeps recovered server metadata in the next sync payload', async () => {
  const workout: LocalWorkout = {
    clientId: 'workout-1', name: 'Fuerza', revision: 4, status: 'ACTIVE', startedAt: '2026-08-30T10:00:00.000Z',
    notes: 'Controla el descenso', routineId: 'routine-1', deletedSetClientIds: [],
    sets: [{
      clientId: 'server-set', revision: 2, exerciseId: 'exercise-1', order: 0,
      reps: 5, weightKg: 50, durationS: null, rpe: 7, isWarmup: true,
      techniqueStable: false, completedAt: '2026-08-30T10:25:00.000Z',
    }],
  };
  useTrainingStore.setState({ activeWorkout: workout, ready: true, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  await useTrainingStore.getState().updateSet('server-set', {});

  expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)?.[3]).toMatchObject({
    notes: 'Controla el descenso',
    routineId: 'routine-1',
    sets: [{ isWarmup: true, techniqueStable: false, completedAt: '2026-08-30T10:25:00.000Z' }],
  });
});

it('keeps recovered nullable scalar metadata in the next sync payload', async () => {
  const workout: LocalWorkout = {
    clientId: 'workout-1', name: 'Fuerza', revision: 4, status: 'ACTIVE', startedAt: '2026-08-30T10:00:00.000Z',
    notes: '', routineId: null, deletedSetClientIds: [], sets: [],
  };
  useTrainingStore.setState({ activeWorkout: workout, ready: true, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  await useTrainingStore.getState().addSet('exercise-1');

  expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)?.[3]).toMatchObject({ notes: '', routineId: null });
});

it('persists a cancelled snapshot before removing the active workout', async () => {
  let releaseWrite!: (state: 'pending') => void;
  jest.mocked(enqueueWorkout).mockImplementationOnce(() => new Promise((resolve) => { releaseWrite = resolve; }));
  const workout: LocalWorkout = {
    clientId: 'workout-cancel', name: 'Fuerza', revision: 2, status: 'ACTIVE', notes: null,
    startedAt: '2026-08-30T10:00:00.000Z', deletedSetClientIds: [], sets: [],
  };
  useTrainingStore.setState({ activeWorkout: workout, ready: true, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  const cancellation = useTrainingStore.getState().cancelWorkout();

  expect(useTrainingStore.getState().activeWorkout).toMatchObject({ status: 'CANCELLED' });
  await waitFor(() => {
    expect(jest.mocked(enqueueWorkout).mock.calls.at(-1)?.[3]).toMatchObject({
      clientId: 'workout-cancel',
      baseRevision: 2,
      status: 'CANCELLED',
      cancelledAt: expect.any(String),
    });
  });
  releaseWrite('pending');
  await cancellation;
  expect(useTrainingStore.getState().activeWorkout).toBeNull();
});

it('restores the persisted workout and reports a local save failure when adding a set', async () => {
  const workout: LocalWorkout = {
    clientId: 'workout-local', name: 'Fuerza', revision: 0, status: 'ACTIVE', notes: null,
    startedAt: '2026-08-30T10:00:00.000Z', deletedSetClientIds: [], sets: [],
  };
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
  useTrainingStore.setState({ activeWorkout: workout, ready: true, error: null, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  await useTrainingStore.getState().addSet('exercise-1');

  expect(useTrainingStore.getState().activeWorkout).toEqual(workout);
  expect(useTrainingStore.getState().error).toContain('SQLite sin espacio');
});

it.each(['updateSet', 'deleteSet'] as const)('restores the persisted workout after %s fails to save', async (operation) => {
  const workout: LocalWorkout = {
    clientId: 'workout-local', name: 'Fuerza', revision: 0, status: 'ACTIVE', notes: null,
    startedAt: '2026-08-30T10:00:00.000Z', deletedSetClientIds: [],
    sets: [{ clientId: 'set-local', revision: 0, exerciseId: 'exercise-1', order: 0,
      reps: 8, weightKg: 50, durationS: null, rpe: null, isWarmup: false,
      techniqueStable: null, completedAt: '2026-08-30T10:05:00.000Z' }],
  };
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(workout);
  useTrainingStore.setState({ activeWorkout: workout, ready: true, error: null, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  if (operation === 'updateSet') await useTrainingStore.getState().updateSet('set-local', { reps: 9 });
  else await useTrainingStore.getState().deleteSet('set-local');

  expect(useTrainingStore.getState().activeWorkout).toEqual(workout);
  expect(useTrainingStore.getState().error).toContain('SQLite sin espacio');
});

it('does not display an unpersisted workout after starting it fails locally', async () => {
  jest.mocked(enqueueWorkout).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  jest.mocked(loadActiveWorkout).mockResolvedValueOnce(null);
  useTrainingStore.setState({ activeWorkout: null, ready: true, error: null, session: { userId: 'user-a', serverUrl: 'https://api.example.com', version: 1 } });

  await useTrainingStore.getState().startWorkout();

  expect(useTrainingStore.getState().activeWorkout).toBeNull();
  expect(useTrainingStore.getState().error).toContain('SQLite sin espacio');
});
