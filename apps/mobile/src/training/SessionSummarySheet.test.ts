import { buildSessionSummary } from './SessionSummarySheet';
import type { LocalWorkout } from './workout-domain';
import type { ExerciseInsight } from './use-exercise-insights';

const workout: LocalWorkout = {
  clientId: 'workout-1',
  revision: 1,
  name: 'Tren inferior',
  startedAt: '2026-11-09T10:00:00.000Z',
  status: 'ACTIVE',
  notes: null,
  deletedSetClientIds: [],
  sets: [
    {
      clientId: 'warmup', exerciseId: 'squat', order: 0, weightKg: 100, reps: 5, durationS: null,
      rpe: null, isWarmup: true, setType: 'WARMUP', techniqueStable: null,
      completedAt: '2026-11-09T10:05:00.000Z', revision: 0,
    },
    {
      clientId: 'working-1', exerciseId: 'squat', order: 1, weightKg: 80, reps: 5, durationS: null,
      rpe: null, isWarmup: false, setType: 'NORMAL', techniqueStable: null,
      completedAt: '2026-11-09T10:10:00.000Z', revision: 0,
    },
    {
      clientId: 'working-2', exerciseId: 'squat', order: 2, weightKg: 90, reps: 3, durationS: null,
      rpe: null, isWarmup: false, setType: 'NORMAL', techniqueStable: null,
      completedAt: '2026-11-09T10:20:00.000Z', revision: 0,
    },
    {
      // Never ticked: it must not count for volume, records or the exercise list.
      clientId: 'pending', exerciseId: 'squat', order: 3, weightKg: 120, reps: 1, durationS: null,
      rpe: null, isWarmup: false, setType: 'NORMAL', techniqueStable: null,
      completedAt: null, revision: 0,
    },
    {
      clientId: 'row', exerciseId: 'row', order: 4, weightKg: 50, reps: 10, durationS: null,
      rpe: null, isWarmup: false, setType: 'NORMAL', techniqueStable: null,
      completedAt: '2026-11-09T10:25:00.000Z', revision: 0,
    },
  ],
};

const insights: Record<string, ExerciseInsight> = {
  squat: {
    target: null,
    targetSavedAt: null,
    previous: [{ weightKg: 85, reps: 5, durationS: null }],
  },
  row: {
    target: null,
    targetSavedAt: null,
    previous: [{ weightKg: 50, reps: 8, durationS: null }],
  },
};

const info = new Map([['squat', { name: 'Sentadilla' }], ['row', { name: 'Remo' }]]);
const now = new Date('2026-11-09T10:30:00.000Z').getTime();

it('summarizes completed working sets and ignores warm-ups and unticked sets', () => {
  const summary = buildSessionSummary(workout, info, insights, now);
  expect(summary).toMatchObject({
    name: 'Tren inferior',
    durationMs: 30 * 60 * 1000,
    volumeKg: 80 * 5 + 90 * 3 + 50 * 10,
    completedSets: 3,
    records: 1,
  });
  expect(summary.exercises.map((exercise) => exercise.id)).toEqual(['squat', 'row']);
});

it('claims a record only when there is a real previous best to beat', () => {
  const summary = buildSessionSummary(workout, info, insights, now);
  const squat = summary.exercises.find((exercise) => exercise.id === 'squat')!;
  expect(squat).toMatchObject({
    name: 'Sentadilla',
    bestWeightKg: 90,
    bestReps: 3,
    previousBestWeightKg: 85,
    record: true,
  });
  const row = summary.exercises.find((exercise) => exercise.id === 'row')!;
  expect(row).toMatchObject({ bestWeightKg: 50, previousBestWeightKg: 50, record: false });
});

it('never claims a record on the first session of an exercise', () => {
  const summary = buildSessionSummary(workout, info, { squat: { target: null, targetSavedAt: null, previous: [] } }, now);
  expect(summary.exercises[0]).toMatchObject({ previousBestWeightKg: null, record: false });
  expect(summary.records).toBe(0);
});

it('keeps an unknown exercise visible with a neutral name', () => {
  const summary = buildSessionSummary(workout, new Map(), insights, now);
  expect(summary.exercises[0].name).toBe('Ejercicio');
});

it('uses the best set weight even when its reps are lower', () => {
  const summary = buildSessionSummary(workout, info, insights, now);
  expect(summary.exercises[0].bestReps).toBe(3);
});
