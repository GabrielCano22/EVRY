import type { components } from '@evry/api-client';
import { canonicalWorkoutFromServer } from './conflict-resolution';

const serverWorkout: components['schemas']['SyncCanonicalWorkout'] = {
      id: 'server-workout',
      userId: 'user-a',
      clientId: null,
      lastSyncId: 'sync-server',
      revision: 4,
      name: 'Fuerza A',
      startedAt: '2026-08-30T10:00:00.000Z',
      endedAt: null,
      cancelledAt: null,
      status: 'ACTIVE',
      cyclePhase: null,
      notes: 'Mantener control del descenso',
      routineId: 'routine-1',
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:30:00.000Z',
      routine: null,
      sets: [{
        id: 'server-set',
        workoutId: 'server-workout',
        clientId: null,
        clientMutationId: 'mutation-1',
        revision: 2,
        exerciseId: 'exercise-1',
        order: 0,
        weightKg: 50,
        reps: 5,
        durationS: null,
        rpe: 7,
        isWarmup: true,
        techniqueStable: false,
        completedAt: '2026-08-30T10:25:00.000Z',
        updatedAt: '2026-08-30T10:25:00.000Z',
        exercise: {
          id: 'exercise-1',
          sourceId: null,
          name: 'Sentadilla',
          muscleGroup: 'QUADS',
          equipment: 'BARBELL',
          category: null,
          bodyPart: null,
          target: null,
          secondaryMuscles: [],
          equipmentLabel: null,
          isCustom: false,
          ownerId: null,
          isCompound: true,
          tags: [],
          description: null,
          mediaId: null,
          imagePath: null,
          gifPath: null,
          attribution: null,
          instructions: null,
          instructionSteps: null,
          createdAt: '2026-08-30T10:00:00.000Z',
        },
      }],
};

describe('sync conflict resolution', () => {
  it('keeps every sync-canonical field when the user continues the server version', () => {
    const result = canonicalWorkoutFromServer('local-workout', serverWorkout);

    expect(result).toMatchObject({
      clientId: 'local-workout',
      revision: 4,
      notes: 'Mantener control del descenso',
      routineId: 'routine-1',
    });
    expect(result.sets[0]).toMatchObject({
      clientId: 'server-set',
      isWarmup: true,
      techniqueStable: false,
      completedAt: '2026-08-30T10:25:00.000Z',
    });
  });
});
