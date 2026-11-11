import type { SyncCanonicalWorkoutForRecovery } from '../api/client';
import type { LocalWorkout } from '../training/workout-domain';

type IdentifiedWorkout = Omit<SyncCanonicalWorkoutForRecovery, 'clientId' | 'sets'> & {
  clientId: string;
  sets: (SyncCanonicalWorkoutForRecovery['sets'][number] & { clientId: string })[];
};
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hasSyncIdentities(server: SyncCanonicalWorkoutForRecovery): server is IdentifiedWorkout {
  return typeof server.clientId === 'string' && uuidV4.test(server.clientId)
    && server.sets.every((set) => typeof set.clientId === 'string' && uuidV4.test(set.clientId));
}

export function canonicalWorkoutFromServer(
  server: SyncCanonicalWorkoutForRecovery,
): LocalWorkout {
  if (!hasSyncIdentities(server)) {
    throw new Error('La versión del servidor necesita identidades UUID de sincronización. Conéctate e inténtalo de nuevo.');
  }
  return {
    clientId: server.clientId,
    revision: server.revision,
    name: server.name,
    startedAt: server.startedAt,
    ...(server.endedAt ? { endedAt: server.endedAt } : {}),
    ...(server.cancelledAt ? { cancelledAt: server.cancelledAt } : {}),
    status: server.status,
    notes: server.notes,
    routineId: server.routineId,
    sets: server.sets.map((set) => ({
      clientId: set.clientId,
      revision: set.revision,
      exerciseId: set.exerciseId,
      order: set.order,
      weightKg: set.weightKg ?? null,
      reps: set.reps ?? null,
      durationS: set.durationS ?? null,
      rpe: set.rpe ?? null,
      isWarmup: set.isWarmup,
      ...(set.setType ? { setType: set.setType } : {}),
      techniqueStable: set.techniqueStable,
      completedAt: set.completedAt ?? null,
    })),
    deletedSetClientIds: [],
  };
}
