import { summarizeRecordedMuscles } from './muscle-summary';

it('counts useful non-warmup sets by their known primary group', () => {
  const summary = summarizeRecordedMuscles([
    { exerciseId: 'squat', reps: 8, durationS: null, isWarmup: false },
    { exerciseId: 'squat', reps: 10, durationS: null, isWarmup: true },
    { exerciseId: 'press', reps: 0, durationS: null, isWarmup: false },
    { exerciseId: 'plank', reps: null, durationS: 30, isWarmup: false },
    { exerciseId: 'unknown', reps: 5, durationS: null, isWarmup: false },
  ], [
    { id: 'squat', muscleGroup: 'QUADS' },
    { id: 'press', muscleGroup: 'CHEST' },
    { id: 'plank', muscleGroup: 'CORE' },
  ]);
  expect(summary.groups).toEqual([{ muscleGroup: 'CORE', workingSets: 1 }, { muscleGroup: 'QUADS', workingSets: 1 }]);
  expect(summary.unclassifiedSets).toBe(1);
});

it('does not invent muscle activity for empty or unclassified data', () => {
  expect(summarizeRecordedMuscles([], [])).toEqual({ groups: [], unclassifiedSets: 0 });
  expect(summarizeRecordedMuscles([{ exerciseId: 'missing', reps: 3, durationS: null, isWarmup: false }], []))
    .toEqual({ groups: [], unclassifiedSets: 1 });
});
