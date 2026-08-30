import { canonicalWorkoutFromServer } from './conflict-resolution';

describe('sync conflict resolution', () => {
  it('maps the server version to an editable local workout without changing its revision', () => {
    const result = canonicalWorkoutFromServer('local-workout', {
      id: 'server-workout',
      clientId: null,
      revision: 4,
      name: 'Fuerza A',
      startedAt: '2026-08-30T10:00:00.000Z',
      endedAt: null,
      cancelledAt: null,
      status: 'ACTIVE',
      sets: [{
        id: 'server-set',
        clientId: null,
        exerciseId: 'exercise-1',
        order: 0,
        revision: 2,
        weightKg: 50,
        reps: 5,
        durationS: null,
        rpe: 7,
      }],
    });

    expect(result).toMatchObject({ clientId: 'local-workout', revision: 4, status: 'ACTIVE' });
    expect(result.sets[0]).toMatchObject({ clientId: 'server-set', revision: 2, weightKg: 50 });
  });
});
