import type { SyncCanonicalWorkoutForRecovery } from '../api/client';
import type { LocalWorkout } from '../training/workout-domain';

export function canonicalWorkoutFromServer(
  fallbackClientId: string,
  server: SyncCanonicalWorkoutForRecovery,
): LocalWorkout {
  return {
    clientId: server.clientId ?? fallbackClientId,
    revision: server.revision,
    name: server.name,
    startedAt: server.startedAt,
    ...(server.endedAt ? { endedAt: server.endedAt } : {}),
    ...(server.cancelledAt ? { cancelledAt: server.cancelledAt } : {}),
    status: server.status,
    notes: server.notes,
    routineId: server.routineId,
    sets: server.sets.map((set) => ({
      clientId: set.clientId ?? set.id,
      revision: set.revision,
      exerciseId: set.exerciseId,
      order: set.order,
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
      durationS: set.durationS ?? null,
      rpe: set.rpe ?? null,
      isWarmup: set.isWarmup,
      techniqueStable: set.techniqueStable,
      completedAt: set.completedAt,
    })),
    deletedSetClientIds: [],
  };
}
