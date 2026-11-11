import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';
import { startRestTimer } from '@evry/domain';
import { RestTimer, type RestStartRequest } from './RestTimer';
import { loadRestTimer, saveRestTimer } from '../db/database';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

// Native haptics, storage and the session ownership check are replaced at their
// boundary. The timer state machine and the component stay real.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
jest.mock('../api/client', () => ({
  isCurrentMobileSession: () => true,
  onMobileSessionInvalidated: () => () => undefined,
}));
jest.mock('../db/database', () => ({
  loadRestTimer: jest.fn(async () => null),
  saveRestTimer: jest.fn(async () => undefined),
}));

const session = { userId: 'rest-user', serverUrl: 'https://example.test/api/v1', version: 1 };
const workout: LocalWorkout = {
  clientId: 'workout-1', revision: 0, status: 'ACTIVE', name: 'Sesión', notes: null,
  startedAt: '2026-11-08T10:00:00.000Z', deletedSetClientIds: [], sets: [],
};
const request = (overrides: Partial<RestStartRequest> = {}): RestStartRequest => ({
  key: 'request-1', seconds: 60, label: null, exerciseId: 'exercise-1', ...overrides,
});

function show(startRequest: RestStartRequest | null = null, state: 'ACTIVE' | 'COMPLETED' = 'ACTIVE') {
  return render(<RestTimer
    onAdjustExercise={jest.fn()}
    session={session}
    startRequest={startRequest}
    workoutId={workout.clientId}
  />);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-08T10:00:00.000Z'));
  // The React Native Jest mock exposes currentState as a jest.fn(); the timer
  // only ticks while the app is foregrounded.
  (AppState as unknown as { currentState: string }).currentState = 'active';
  jest.mocked(Haptics.notificationAsync).mockClear();
  jest.mocked(loadRestTimer).mockReset().mockResolvedValue(null);
  jest.mocked(saveRestTimer).mockReset().mockResolvedValue(undefined);
  useSessionStore.setState({ session });
  useTrainingStore.setState({
    session, ready: true, activeWorkout: workout, localSaveState: 'saved', syncState: 'synced', error: null,
  });
});
afterEach(() => jest.useRealTimers());

it('hydrates the durable rest of this workout instead of starting from zero', async () => {
  jest.mocked(loadRestTimer).mockResolvedValue(startRestTimer(90));
  await show();
  expect(await screen.findByLabelText('Pausar descanso')).toBeTruthy();
  expect(screen.getByText('01:30')).toBeTruthy();
  expect(screen.getByText('Descanso')).toBeTruthy();
  expect(loadRestTimer).toHaveBeenCalledWith(session, 'workout-1');
});

it('starts a rest for the completed set and persists every ±15 adjustment', async () => {
  const onAdjustExercise = jest.fn();
  await render(<RestTimer
    onAdjustExercise={onAdjustExercise}
    session={session}
    startRequest={request({ label: 'Calentamiento · descanso corto' })}
    workoutId={workout.clientId}
  />);

  expect(await screen.findByText('01:00')).toBeTruthy();
  expect(screen.getByText('Calentamiento · descanso corto')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenCalledWith(session, 'workout-1', expect.objectContaining({ mode: 'RUNNING', remainingMs: 60_000 }));

  await act(async () => { await fireEvent.press(screen.getByLabelText('Añadir quince segundos de descanso')); });
  expect(await screen.findByText('01:15')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(session, 'workout-1', expect.objectContaining({ mode: 'RUNNING', remainingMs: 75_000 }));
  expect(onAdjustExercise).toHaveBeenCalledWith('exercise-1', 15);

  await act(async () => { await fireEvent.press(screen.getByLabelText('Restar quince segundos de descanso')); });
  expect(await screen.findByText('01:00')).toBeTruthy();
  expect(onAdjustExercise).toHaveBeenLastCalledWith('exercise-1', -15);
});

it('pauses and resumes without losing the remaining rest', async () => {
  await show(request({ key: 'request-pause' }));
  await act(async () => { await fireEvent.press(await screen.findByLabelText('Pausar descanso')); });
  expect(await screen.findByText('Pausado · toca para seguir')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(session, 'workout-1', expect.objectContaining({ mode: 'PAUSED', deadlineMs: null }));

  await act(async () => { await fireEvent.press(screen.getByLabelText('Reanudar descanso')); });
  expect(await screen.findByLabelText('Pausar descanso')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(session, 'workout-1', expect.objectContaining({ mode: 'RUNNING' }));
});

it('skips the rest without vibrating as if it had finished', async () => {
  await show(request({ key: 'request-skip' }));
  await act(async () => { await fireEvent.press(await screen.findByLabelText('Omitir descanso')); });

  await waitFor(() => expect(saveRestTimer).toHaveBeenLastCalledWith(
    session, 'workout-1', expect.objectContaining({ mode: 'FINISHED', notificationDelivered: true }),
  ));
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('announces the end of the rest exactly once and then hides the bar', async () => {
  await show(request({ key: 'request-finish', seconds: 5 }));
  await screen.findByText('00:05');

  await act(async () => { await jest.advanceTimersByTimeAsync(5_000); });
  expect(await screen.findByText('Descanso terminado')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(
    session, 'workout-1', expect.objectContaining({ mode: 'FINISHED', notificationDelivered: true }),
  );
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

  await act(async () => { await jest.advanceTimersByTimeAsync(3_000); });
  expect(screen.queryByText('Descanso terminado')).toBeNull();
  expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
});

it('keeps the previous rest visible and offers a retry when the local write fails', async () => {
  jest.mocked(saveRestTimer).mockRejectedValueOnce(new Error('SQLite sin espacio'));
  await show(request({ key: 'request-failure' }));

  expect(await screen.findByText('SQLite sin espacio')).toBeTruthy();
  expect(screen.getByLabelText('Reintentar descanso')).toBeTruthy();
  await act(async () => { await fireEvent.press(screen.getByLabelText('Reintentar descanso')); });
  expect(await screen.findByLabelText('Pausar descanso')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(session, 'workout-1', expect.objectContaining({ mode: 'RUNNING' }));
});

it('does not paint a rest for a workout that is no longer active', async () => {
  jest.mocked(loadRestTimer).mockResolvedValue(startRestTimer(90));
  useTrainingStore.setState({ activeWorkout: { ...workout, status: 'COMPLETED' } });
  await show();
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByLabelText('Pausar descanso')).toBeNull();
  expect(loadRestTimer).not.toHaveBeenCalled();
});

it('replaces the current rest when a new set starts another one', async () => {
  const view = await show(request({ key: 'first', seconds: 30 }));
  await screen.findByText('00:30');
  await view.rerender(<RestTimer
    onAdjustExercise={jest.fn()}
    session={session}
    startRequest={request({ key: 'second', seconds: 120, exerciseId: 'exercise-2' })}
    workoutId={workout.clientId}
  />);
  expect(await screen.findByText('02:00')).toBeTruthy();
  expect(saveRestTimer).toHaveBeenLastCalledWith(session, 'workout-1', expect.objectContaining({ remainingMs: 120_000 }));
});
