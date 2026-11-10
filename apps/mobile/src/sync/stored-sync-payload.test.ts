import { decodeSyncPayload } from './stored-sync-payload';
import type { SyncWorkoutInput } from '../api/client';

const input: SyncWorkoutInput = { clientId: 'legacy-workout', syncId: 'legacy-sync', baseRevision: 2,
  name: 'Local', startedAt: '2026-08-30T10:00:00Z', status: 'ACTIVE', sets: [], deletedSetClientIds: [] };
const decode = (value: unknown) => decodeSyncPayload({ id: 1, syncId: input.syncId,
  workoutClientId: input.clientId, attempts: 0, payload: JSON.stringify(value) });

it.each([
  { status: ['ACTIVE'] }, { status: 'DRAFT' }, { syncId: 'another-sync' }, { baseRevision: -1 },
  { baseRevision: 0.5 }, { startedAt: 'not a date' }, { notes: 123 }, { routineId: [] },
  { deletedSetClientIds: [null] }, { endedAt: {} },
  { sets: [{ clientId: 'set-1', exerciseId: 'exercise-1', baseRevision: 0, order: 1, isWarmup: null }] },
  { sets: [{ clientId: 'set-1', exerciseId: 'exercise-1', baseRevision: 0, order: 1, reps: 0.5 }] },
])('rejects structurally invalid transport fields: %j', (changes) => {
  expect(decode({ ...input, ...changes })).toBeNull();
});

it('accepts baseRevision, symbolic IDs and optional/null fields without requiring LocalWorkout fields', () => {
  const value = { ...input, notes: null, routineId: null, endedAt: null, cancelledAt: null,
    extension: { kept: [2, 1] }, sets: [{ clientId: 'legacy-set', exerciseId: 'legacy-exercise',
      baseRevision: 1, order: 2, weightKg: null, reps: null, durationS: null, rpe: null,
      techniqueStable: null, completedAt: null }] };
  expect(decode(value)).toEqual(value);
});

it('keeps numeric optional values and delegates server business limits', () => {
  const value = { ...input, sets: [{ clientId: 'set-1', exerciseId: 'exercise-1', baseRevision: 0,
    order: 0, weightKg: 50.5, reps: 8, durationS: 60, rpe: 11, isWarmup: false,
    techniqueStable: true, completedAt: input.startedAt }] };
  expect(decode(value)).toEqual(value);
});
