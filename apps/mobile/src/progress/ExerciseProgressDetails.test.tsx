import { render } from '@testing-library/react-native';
import type { components } from '@evry/api-client';
import { ExerciseProgressDetails } from './ExerciseProgressDetails';

it('keeps missing records distinct from zero and shows timed sets with their units', async () => {
  const data = {
    exerciseId: 'exercise', summary: { sessionsCount: 1, workingSetsCount: 1, volumeKg: 0, bestWeight: null, repetitionRecord: null, estimated1RM: null },
    comparison: null, points: [],
    history: { items: [{ workoutId: 'workout', workoutName: 'Plancha', startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-01-01T12:30:00Z',
      sets: [{ id: 'set', order: 1, weightKg: null, reps: null, durationS: 45, rpe: null, completedAt: '2026-01-01T12:20:00Z' }] }], page: null, limit: 20, total: 1, hasMore: false, nextCursor: null },
  };
  const screen = await render(<ExerciseProgressDetails summary={data.summary} comparison={data.comparison} points={data.points} history={data.history.items} />);
  expect(screen.getByText('Sin récord de peso')).toBeTruthy();
  expect(screen.getByText('45 s')).toBeTruthy();
  expect(screen.queryByText('0 kg · 0 repeticiones')).toBeNull();
});

it('shows the canonical interval volume and session count', async () => {
  const summary: components['schemas']['ExerciseProgressSummary'] = { sessionsCount: 2, workingSetsCount: 4, volumeKg: 800, bestWeight: null, repetitionRecord: null, estimated1RM: null };
  const screen = await render(<ExerciseProgressDetails summary={summary} comparison={null} history={[]} points={[
    { from: '2026-01-01T12:00:00Z', to: '2026-01-03T12:00:00Z', sessionsCount: 2, maxWeightKg: 40, estimated1RMKg: 50, volumeKg: 800 },
  ]} />);
  expect(screen.getByText('2 sesiones · 800 kg de volumen')).toBeTruthy();
  expect(screen.getByText('Máximo: 40 kg · 1RM estimado: 50 kg')).toBeTruthy();
});
