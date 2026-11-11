import type { components } from '@evry/api-client';
import { canonicalWorkoutFromServer } from './conflict-resolution';

const serverWorkout: components['schemas']['SyncCanonicalWorkout'] = {
      id: 'server-workout',
      userId: 'user-a',
      clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
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
        clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544',
        clientMutationId: 'mutation-1',
        revision: 2,
        exerciseId: 'exercise-1',
        order: 0,
        weightKg: 50,
        reps: 5,
        durationS: null,
        rpe: 7,
        isWarmup: true,
        setType: 'WARMUP',
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
    const result = canonicalWorkoutFromServer(serverWorkout);

    expect(result).toMatchObject({
      clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
      revision: 4,
      notes: 'Mantener control del descenso',
      routineId: 'routine-1',
    });
    expect(result.sets[0]).toMatchObject({
      clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544',
      isWarmup: true,
      techniqueStable: false,
      completedAt: '2026-08-30T10:25:00.000Z',
    });
  });

  it.each([
    { ...serverWorkout, clientId: null },
    { ...serverWorkout, clientId: 'server-workout-cuid' },
    { ...serverWorkout, sets: [{ ...serverWorkout.sets[0], clientId: null }] },
    { ...serverWorkout, sets: [{ ...serverWorkout.sets[0], clientId: 'server-set-cuid' }] },
  ])('refuses to invent unsynchronizable identities for an unadopted server snapshot %#', (server) => {
    expect(() => canonicalWorkoutFromServer(server)).toThrow(/identidades/);
  });
});
