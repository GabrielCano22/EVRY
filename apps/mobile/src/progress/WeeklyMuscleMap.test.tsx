import { cleanup, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MobileSession } from '../api/client';
import { cachedExerciseGroups, loadPendingCompletedWorkouts } from '../db/database';
import type { LocalWorkout } from '../training/workout-domain';
import { useTrainingStore } from '../training/training-store';
import { WeeklyMuscleMap } from './WeeklyMuscleMap';

const mockGet = jest.fn();
jest.mock('../api/client', () => ({ withMobileAuth: (fn: (client: unknown) => unknown) => fn({ GET: mockGet }) }));
jest.mock('../db/database', () => ({ cachedExerciseGroups: jest.fn().mockResolvedValue([]), loadPendingCompletedWorkouts: jest.fn().mockResolvedValue([]) }));
jest.mock('../profile/use-readiness-day', () => ({ useReadinessDay: () => ({ day: '2026-11-09' }) }));
jest.mock('../training/training-store', () => ({ useTrainingStore: jest.fn() }));
jest.mock('./body-muscle-map', () => ({ BodyMuscleMap: ({ distribution }: { distribution: unknown }) => {
  const { Text } = jest.requireActual('react-native');
  return <Text>{JSON.stringify(distribution)}</Text>;
} }));

const session = { userId: 'weekly-user', version: 1, serverUrl: 'https://example.test/api/v1' } as MobileSession;
beforeEach(() => {
  jest.mocked(loadPendingCompletedWorkouts).mockReset().mockResolvedValue([]);
  jest.mocked(cachedExerciseGroups).mockReset().mockResolvedValue([]);
  jest.mocked(useTrainingStore).mockImplementation((selector) => selector({ activeWorkout: null } as ReturnType<typeof useTrainingStore.getState>) as never);
  mockGet.mockReset().mockImplementation(async (path: string) => path === '/progress/activity'
    ? { data: { days: [{ date: '2026-11-09', sessions: [{ id: 'workout-1' }] }] } }
    : { data: { id: 'workout-1', status: 'COMPLETED', endedAt: '2026-11-09T15:00:00Z', cancelledAt: null,
      sets: [{ exerciseId: 'squat', reps: 8, durationS: null, isWarmup: false, exercise: { id: 'squat', muscleGroup: 'QUADS' } }] } });
});

it('shows a pending local completed workout when the server is unavailable', async () => {
  const workout = { clientId: 'local', revision: 0, status: 'COMPLETED', endedAt: '2026-11-09T15:00:00Z',
    sets: [{ exerciseId: 'squat', reps: 8, durationS: null, isWarmup: false }] } as LocalWorkout;
  jest.mocked(loadPendingCompletedWorkouts).mockResolvedValue([workout]);
  jest.mocked(cachedExerciseGroups).mockResolvedValue([{ id: 'squat', muscleGroup: 'QUADS' }]);
  mockGet.mockResolvedValue({ error: { message: 'offline' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><WeeklyMuscleMap session={session} sex="MALE" /></QueryClientProvider>);
  expect(await screen.findByText('[{"muscleGroup":"QUADS","workingSets":1}]')).toBeTruthy();
  expect(await screen.findByText(/mapa puede estar incompleto/)).toBeTruthy();
  await cleanup(); client.clear();
});

it('loads this week’s session details and highlights only their recorded primary muscles', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><WeeklyMuscleMap session={session} sex="MALE" /></QueryClientProvider>);
  expect(await screen.findByText('[{"muscleGroup":"QUADS","workingSets":1}]')).toBeTruthy();
  expect(mockGet).toHaveBeenCalledWith('/progress/activity', expect.objectContaining({ params: { query: { from: '2026-11-09', to: '2026-11-09' } } }));
  expect(mockGet).toHaveBeenCalledWith('/workouts/{id}', expect.objectContaining({ params: { path: { id: 'workout-1' } } }));
  await cleanup(); client.clear();
});

it('warns instead of displaying a false empty map when loading fails', async () => {
  mockGet.mockResolvedValue({ error: { message: 'offline' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><WeeklyMuscleMap session={session} sex="MALE" /></QueryClientProvider>);
  expect(await screen.findByText(/mapa puede estar incompleto/)).toBeTruthy();
  expect(screen.queryByText('[]')).toBeNull();
  await cleanup(); client.clear();
});
