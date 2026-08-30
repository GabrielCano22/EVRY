import type { SyncWorkoutInput } from '../api/client';
import type { LocalWorkout } from '../training/workout-domain';

export interface CanonicalSetRevision {
  clientId: string;
  revision: number;
}

export function rebaseWorkoutRevisions(
  workout: LocalWorkout,
  revision: number,
  canonicalSets: CanonicalSetRevision[],
): LocalWorkout {
  const revisions = new Map(canonicalSets.map((set) => [set.clientId, set.revision]));
  return {
    ...workout,
    revision,
    sets: workout.sets.map((set) => ({ ...set, revision: Math.max(revisions.get(set.clientId) ?? 0, set.revision) })),
  };
}

export function rebaseSyncPayload(
  payload: SyncWorkoutInput,
  revision: number,
  canonicalSets: CanonicalSetRevision[],
): SyncWorkoutInput {
  const revisions = new Map(canonicalSets.map((set) => [set.clientId, set.revision]));
  return {
    ...payload,
    baseRevision: revision,
    sets: payload.sets.map((set) => ({ ...set, baseRevision: Math.max(revisions.get(set.clientId) ?? 0, set.baseRevision) })),
  };
}
