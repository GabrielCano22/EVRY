import { rebaseSyncPayload, rebaseWorkoutRevisions } from './revisions';
import type { LocalWorkout } from '../training/workout-domain';

const workout: LocalWorkout = {
  clientId: 'workout-local', revision: 0, name: 'Fuerza', startedAt: '2026-08-30T10:00:00.000Z',
  status: 'ACTIVE', notes: null, deletedSetClientIds: [],
  sets: [{
    clientId: 'set-1', revision: 0, exerciseId: 'squat', order: 0, weightKg: 60, reps: 5,
    durationS: null, rpe: null, isWarmup: false, techniqueStable: null,
    completedAt: '2026-08-30T10:05:00.000Z',
  }],
};

describe('canonical sync revisions', () => {
  it('updates revisions without replacing a newer local edit', () => {
    const rebased = rebaseWorkoutRevisions(workout, 3, [{ clientId: 'set-1', revision: 2 }]);
    expect(rebased.revision).toBe(3);
    expect(rebased.sets[0]).toMatchObject({ revision: 2, weightKg: 60, reps: 5 });
    expect(workout.revision).toBe(0);
  });

  it('rebases a queued newer mutation and keeps its idempotency key', () => {
    const rebased = rebaseSyncPayload({
      clientId: workout.clientId, syncId: 'new-mutation', baseRevision: 0,
      name: workout.name, startedAt: workout.startedAt, status: 'COMPLETED',
      sets: [{ clientId: 'set-1', baseRevision: 0, exerciseId: 'squat', order: 0, weightKg: 65, reps: 5 }],
      deletedSetClientIds: [],
    }, 3, [{ clientId: 'set-1', revision: 2 }]);
    expect(rebased).toMatchObject({ syncId: 'new-mutation', baseRevision: 3, status: 'COMPLETED' });
    expect(rebased.sets[0]).toMatchObject({ baseRevision: 2, weightKg: 65 });
  });
});
