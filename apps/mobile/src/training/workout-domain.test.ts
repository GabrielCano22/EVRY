import { cancelLocalWorkout, finishLocalWorkout, type LocalWorkout } from './workout-domain';

const workout = (sets: LocalWorkout['sets']): LocalWorkout => ({
  clientId: 'e9c3cf4e-d2c5-4cd5-96e3-eb9b1e005dde',
  revision: 0,
  name: 'Piernas',
  startedAt: '2026-08-29T12:00:00.000Z',
  status: 'ACTIVE',
  notes: null,
  sets,
  deletedSetClientIds: [],
});

describe('finishLocalWorkout', () => {
  it('rejects a workout without a useful set', () => {
    expect(() => finishLocalWorkout(workout([]), new Date('2026-08-29T13:00:00.000Z')))
      .toThrow('serie útil');
  });

  it('creates a completed immutable snapshot ready for sync', () => {
    const original = workout([{
      clientId: '59a1bef2-1b8d-4c36-a10e-7faeb7697672',
      revision: 0,
      exerciseId: 'exercise-1',
      order: 0,
      reps: 8,
      weightKg: 60,
      durationS: null,
      rpe: 8,
      isWarmup: false,
      techniqueStable: true,
      completedAt: '2026-08-29T12:30:00.000Z',
    }]);
    const result = finishLocalWorkout(original, new Date('2026-08-29T13:00:00.000Z'));

    expect(result).toMatchObject({
      status: 'COMPLETED',
      endedAt: '2026-08-29T13:00:00.000Z',
    });
    expect(result).not.toBe(original);
  });
});

describe('cancelLocalWorkout', () => {
  it('creates a cancelled immutable snapshot without discarding its sets', () => {
    const original = workout([{
      clientId: '59a1bef2-1b8d-4c36-a10e-7faeb7697672',
      revision: 0,
      exerciseId: 'exercise-1',
      order: 0,
      reps: 8,
      weightKg: 60,
      durationS: null,
      rpe: 8,
      isWarmup: false,
      techniqueStable: true,
      completedAt: '2026-08-29T12:30:00.000Z',
    }]);

    const result = cancelLocalWorkout(original, new Date('2026-08-29T13:00:00.000Z'));

    expect(result).toMatchObject({
      status: 'CANCELLED',
      cancelledAt: '2026-08-29T13:00:00.000Z',
      sets: original.sets,
    });
    expect(result).not.toBe(original);
    expect(result.sets).not.toBe(original.sets);
  });

  it('rejects cancelling a terminal workout', () => {
    const completed = { ...workout([]), status: 'COMPLETED' as const };
    expect(() => cancelLocalWorkout(completed)).toThrow('ya no admite cambios');
  });
});
