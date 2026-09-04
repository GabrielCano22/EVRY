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
  techniqueStable: boolean | null;
  completedAt: string;
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
  return workout.sets.some((set) => (set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0);
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
