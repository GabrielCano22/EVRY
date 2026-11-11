import {
  setTypeOf, type SetType,
} from '@evry/domain';

export type LocalWorkoutStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DRAFT';

export interface LocalWorkoutSet {
  clientId: string;
  revision: number;
  exerciseId: string;
  order: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  rpe: number | null;
  isWarmup: boolean;
  /** Optional so workouts stored before set types existed stay byte-identical. */
  setType?: SetType;
  techniqueStable: boolean | null;
  /** Null until the user ticked the set. Legacy rows are already completed. */
  completedAt: string | null;
}

export function setTypeOfLocal(set: LocalWorkoutSet): SetType {
  return setTypeOf(set);
}


export interface LocalWorkout {
  clientId: string;
  revision: number;
  name: string;
  startedAt: string;
  endedAt?: string;
  cancelledAt?: string;
  status: LocalWorkoutStatus;
  notes: string | null;
  routineId?: string | null;
  sets: LocalWorkoutSet[];
  deletedSetClientIds: string[];
}

export function hasUsefulSet(workout: LocalWorkout): boolean {
  // A set only counts once the lifter ticks it, matching the server rule that
  // rejects finishing a session without a completed useful set.
  return workout.sets.some((set) => set.completedAt !== null
    && ((set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0));
}

export function finishLocalWorkout(workout: LocalWorkout, now: Date = new Date()): LocalWorkout {
  if (workout.status !== 'ACTIVE') throw new Error('La sesión ya no admite cambios.');
  if (!hasUsefulSet(workout)) throw new Error('Registra al menos una serie útil antes de finalizar.');
  return {
    ...workout,
    status: 'COMPLETED',
    endedAt: now.toISOString(),
    cancelledAt: undefined,
    sets: workout.sets.map((set) => ({ ...set })),
    deletedSetClientIds: [...workout.deletedSetClientIds],
  };
}

export function cancelLocalWorkout(workout: LocalWorkout, now: Date = new Date()): LocalWorkout {
  if (workout.status !== 'ACTIVE') throw new Error('La sesión ya no admite cambios.');
  return {
    ...workout,
    status: 'CANCELLED',
    endedAt: undefined,
    cancelledAt: now.toISOString(),
    sets: workout.sets.map((set) => ({ ...set })),
    deletedSetClientIds: [...workout.deletedSetClientIds],
  };
}
