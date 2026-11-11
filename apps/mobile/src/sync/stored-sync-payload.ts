import { isSetType } from '@evry/domain';
import type { SyncWorkoutInput } from '../api/client';
import type { PendingSyncRow } from '../db/database';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const optional = (value: unknown, validate: (value: unknown) => boolean): boolean =>
  value === undefined || value === null || validate(value);

function set(value: unknown): boolean {
  return record(value) && identifier(value.clientId) && identifier(value.exerciseId)
    && integer(value.baseRevision) && integer(value.order)
    && optional(value.weightKg, nonnegative) && optional(value.reps, integer)
    && optional(value.durationS, integer) && optional(value.rpe, finite)
    && (value.isWarmup === undefined || typeof value.isWarmup === 'boolean')
    && optional(value.setType, (item) => isSetType(item))
    && optional(value.techniqueStable, (item) => typeof item === 'boolean')
    && optional(value.completedAt, timestamp);
}

// This is a persisted transport boundary, not LocalWorkout hydration. Preserve
// extensions and legacy IDs; UUID/business constraints remain server-owned.
export function decodeSyncPayload(row: PendingSyncRow): SyncWorkoutInput | null {
  let value: unknown;
  try { value = JSON.parse(row.payload); } catch { return null; }
  if (!record(value) || !identifier(value.clientId) || !identifier(value.syncId)
    || value.clientId !== row.workoutClientId || value.syncId !== row.syncId
    || !integer(value.baseRevision) || typeof value.name !== 'string'
    || !timestamp(value.startedAt) || typeof value.status !== 'string'
    || !['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(value.status)
    || !optional(value.endedAt, timestamp) || !optional(value.cancelledAt, timestamp)
    || !optional(value.notes, (item) => typeof item === 'string') || !optional(value.routineId, identifier)
    || !Array.isArray(value.sets) || !value.sets.every(set)
    || !Array.isArray(value.deletedSetClientIds) || !value.deletedSetClientIds.every(identifier)) return null;
  return value as SyncWorkoutInput;
}
