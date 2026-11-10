import { civilDate } from '@evry/domain';
import type { components } from '@evry/api-client';
import type { LocalWorkout, LocalWorkoutSet } from '../training/workout-domain';
import { currentWeekRange, weeklyMuscleSummary } from './weekly-muscles';

it('starts each week on Monday across month and year boundaries', () => {
  expect(currentWeekRange(civilDate('2027-01-01'))).toEqual({ from: '2026-12-28', to: '2027-01-01' });
  expect(currentWeekRange(civilDate('2026-11-09'))).toEqual({ from: '2026-11-09', to: '2026-11-09' });
  expect(currentWeekRange(civilDate('2026-11-08'))).toEqual({ from: '2026-11-02', to: '2026-11-08' });
});

it('prefers a pending local completion over its server copy without double-counting', () => {
  const set = { exerciseId: 'squat', reps: 8, durationS: null, isWarmup: false, exercise: { id: 'squat', muscleGroup: 'QUADS' } };
  const server = { clientId: 'same', status: 'COMPLETED', endedAt: '2026-11-09T15:00:00Z', cancelledAt: null, sets: [set] } as components['schemas']['Workout'];
  const localSet: LocalWorkoutSet = { clientId: 'set', revision: 0, exerciseId: 'squat', order: 0,
    weightKg: null, reps: 8, durationS: null, rpe: null, isWarmup: false, techniqueStable: null, completedAt: '2026-11-09T14:00:00Z' };
  const local: LocalWorkout = { clientId: 'same', revision: 0, name: 'Prueba', status: 'COMPLETED',
    startedAt: '2026-11-09T14:00:00Z', endedAt: '2026-11-09T15:00:00Z', notes: null,
    sets: [localSet, { ...localSet, clientId: 'set-2', order: 1 }], deletedSetClientIds: [] };
  expect(weeklyMuscleSummary([server], [], [{ id: 'squat', muscleGroup: 'QUADS' }], currentWeekRange(civilDate('2026-11-09')), [local]).groups)
    .toEqual([{ muscleGroup: 'QUADS', workingSets: 2 }]);
});

it('includes only this week’s completed sessions and current-week useful active sets', () => {
  type Workout = components['schemas']['Workout'];
  const set = (group: string, reps: number, isWarmup = false) => ({ exerciseId: group, reps, durationS: null, isWarmup, exercise: { id: group, muscleGroup: group } });
  const workout = (endedAt: string, sets: unknown[]) => ({ status: 'COMPLETED', endedAt, cancelledAt: null, sets }) as Workout;
  const active = (exerciseId: string, completedAt: string, reps = 8) => ({ exerciseId, completedAt, reps, durationS: null, isWarmup: false }) as LocalWorkoutSet;
  const range = currentWeekRange(civilDate('2027-01-01'));
  const result = weeklyMuscleSummary([
    workout('2026-12-28T05:00:00Z', [set('CHEST', 8), set('CHEST', 8, true)]),
    workout('2026-12-28T04:59:59Z', [set('BACK', 8)]),
  ], [active('squat', '2026-12-30T15:00:00Z'), active('squat', '2026-12-27T15:00:00Z'), active('missing', '2027-01-01T15:00:00Z')],
  [{ id: 'squat', muscleGroup: 'QUADS' }], range);
  expect(result.groups).toEqual([{ muscleGroup: 'CHEST', workingSets: 1 }, { muscleGroup: 'QUADS', workingSets: 1 }]);
  expect(result.unclassifiedSets).toBe(1);
  expect(weeklyMuscleSummary([], [], [], currentWeekRange(civilDate('2027-01-04'))).groups).toEqual([]);
});
