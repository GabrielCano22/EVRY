import type { components } from '@evry/api-client';
import type { LocalWorkout } from '../training/workout-domain';

export function canonicalWorkoutFromServer(
  fallbackClientId: string,
  server: components['schemas']['Workout'],
): LocalWorkout {
  return {
    clientId: server.clientId ?? fallbackClientId,
    revision: server.revision,
    name: server.name,
    startedAt: server.startedAt,
    ...(server.endedAt ? { endedAt: server.endedAt } : {}),
    ...(server.cancelledAt ? { cancelledAt: server.cancelledAt } : {}),
    status: server.status,
    notes: null,
    sets: server.sets.map((set) => ({
      clientId: set.clientId ?? set.id,
      revision: set.revision,
      exerciseId: set.exerciseId,
      order: set.order,
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
      durationS: set.durationS ?? null,
      rpe: set.rpe ?? null,
      isWarmup: false,
      techniqueStable: null,
      completedAt: server.endedAt ?? server.startedAt,
    })),
    deletedSetClientIds: [],
  };
}
