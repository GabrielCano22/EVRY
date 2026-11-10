import type { LocalWorkout, LocalWorkoutSet } from '../training/workout-domain';

export interface StoredWorkoutRow {
  client_id: string;
  revision: number;
  status: string;
  payload: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function workoutSet(value: unknown): value is LocalWorkoutSet {
  return record(value) && identifier(value.clientId) && identifier(value.exerciseId)
    && integer(value.revision) && integer(value.order)
    && (value.weightKg === null || nonnegative(value.weightKg))
    && (value.reps === null || integer(value.reps))
    && (value.durationS === null || integer(value.durationS))
    && (value.rpe === null || (typeof value.rpe === 'number' && Number.isFinite(value.rpe)))
    && typeof value.isWarmup === 'boolean'
    && (value.techniqueStable === null || typeof value.techniqueStable === 'boolean')
    && timestamp(value.completedAt);
}

function workout(value: unknown): value is LocalWorkout {
  return record(value) && identifier(value.clientId) && integer(value.revision)
    && typeof value.name === 'string' && timestamp(value.startedAt)
    && (value.endedAt === undefined || timestamp(value.endedAt))
    && (value.cancelledAt === undefined || timestamp(value.cancelledAt))
    && typeof value.status === 'string'
    && ['ACTIVE', 'COMPLETED', 'CANCELLED', 'DRAFT'].includes(value.status)
    && (value.notes === null || typeof value.notes === 'string')
    && (value.routineId === undefined || value.routineId === null || identifier(value.routineId))
    && Array.isArray(value.sets) && value.sets.every(workoutSet)
    && Array.isArray(value.deletedSetClientIds) && value.deletedSetClientIds.every(identifier);
}

// This boundary validates existing data, not new server business rules. Keep
// symbolic legacy IDs and extension fields; never repair, omit or rewrite damage.
export function decodeStoredWorkout(row: StoredWorkoutRow): LocalWorkout {
  let value: unknown;
  try {
    value = JSON.parse(row.payload);
  } catch {
    throw damagedWorkout();
  }
  if (!workout(value) || value.clientId !== row.client_id
    || value.status !== row.status || value.revision !== row.revision) {
    throw damagedWorkout();
  }
  return value;
}

function damagedWorkout(): Error {
  // JSON parser errors may include private notes from the persisted document.
  return new Error('La sesión guardada contiene datos inválidos. Los datos locales se conservan.');
}

// Compare persisted JSON values, including extensions. Sort only each object's
// own properties: a JSON property-list replacer also reads inherited properties.
// Object.fromEntries preserves literal __proto__ keys without setting prototypes.
export function workoutSnapshotsEqual(left: LocalWorkout, right: LocalWorkout): boolean {
  const canonical = (value: LocalWorkout): string => JSON.stringify(value, (_key, item: unknown) =>
    record(item) ? Object.fromEntries(Object.keys(item).sort().map((field) => [field, item[field]])) : item);
  return canonical(left) === canonical(right);
}
