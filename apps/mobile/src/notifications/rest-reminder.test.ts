import * as Notifications from 'expo-notifications';
import { resetNotificationChannelsForTests } from './channels';
import { cancelRestReminder, syncRestReminder } from './rest-reminder';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));

const notifications = jest.mocked(Notifications);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetNotificationChannelsForTests();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
});

it('schedules one deterministic native alert for the end of the rest', async () => {
  await syncRestReminder({
    workoutId: 'workout/1',
    seconds: 90,
    exerciseName: ' Sentadilla ',
    enabled: true,
  });

  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('evry_rest_workout_1');
  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  const request = notifications.scheduleNotificationAsync.mock.calls[0][0];
  expect(request.identifier).toBe('evry_rest_workout_1');
  expect(request.content).toMatchObject({
    title: 'Descanso terminado',
    body: 'Sentadilla: empieza la siguiente serie.',
    sound: 'default',
    data: { kind: 'rest', workoutId: 'workout/1' },
  });
  expect(request.trigger).toMatchObject({ type: 'date', channelId: 'rest' });
  const date = (request.trigger as { date: Date }).date;
  expect(date.getTime()).toBeGreaterThan(Date.now());
});

it('falls back to a neutral body when the exercise name is unknown', async () => {
  await syncRestReminder({ workoutId: 'workout-2', seconds: 30, exerciseName: null, enabled: true });
  expect(notifications.scheduleNotificationAsync.mock.calls[0][0].content.body).toBe('Empieza la siguiente serie.');
});

it('only clears the previous alert when notifications are disabled', async () => {
  await syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: false });
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('evry_rest_workout-1');
  expect(notifications.dismissNotificationAsync).toHaveBeenCalledWith('evry_rest_workout-1');
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('never schedules with a non-positive or non-finite duration', async () => {
  await syncRestReminder({ workoutId: 'workout-1', seconds: 0, enabled: true });
  await syncRestReminder({ workoutId: 'workout-1', seconds: Number.NaN, enabled: true });
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('asks for permission only when the caller requests it', async () => {
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

  await syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true, requestPermission: true });
  expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

  jest.clearAllMocks();
  await syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('cancels both the scheduled request and an already presented alert', async () => {
  await cancelRestReminder('workout-1');
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('evry_rest_workout-1');
  expect(notifications.dismissNotificationAsync).toHaveBeenCalledWith('evry_rest_workout-1');
});

it('does not schedule a started rest paused while its permission request is pending', async () => {
  const permission = deferred<Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>>();
  const requested = deferred<void>();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
  notifications.requestPermissionsAsync.mockImplementation(() => {
    requested.resolve();
    return permission.promise;
  });

  const start = syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true, requestPermission: true });
  await requested.promise;
  const pause = syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: false });
  permission.resolve({ granted: true, canAskAgain: true } as never);
  await Promise.all([start, pause]);

  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
});

it('does not schedule after unmount cancels a rest awaiting permission', async () => {
  const permission = deferred<Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>>();
  const requested = deferred<void>();
  notifications.getPermissionsAsync.mockImplementation(() => {
    requested.resolve();
    return permission.promise;
  });

  const start = syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  await requested.promise;
  const unmount = cancelRestReminder('workout-1');
  permission.resolve({ granted: true, canAskAgain: true } as never);
  await Promise.all([start, unmount]);

  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
});

it('waits for an in-flight native schedule before cancelling on unmount', async () => {
  const scheduled = deferred<string>();
  const scheduling = deferred<void>();
  notifications.scheduleNotificationAsync.mockImplementation(() => {
    scheduling.resolve();
    return scheduled.promise;
  });

  const start = syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  await scheduling.promise;
  const unmount = cancelRestReminder('workout-1');
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  scheduled.resolve('evry_rest_workout-1');
  await Promise.all([start, unmount]);

  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
  expect(notifications.dismissNotificationAsync).toHaveBeenCalledTimes(2);
});

it('does not block another workout while permission is pending', async () => {
  const permission = deferred<Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>>();
  const requested = deferred<void>();
  notifications.getPermissionsAsync.mockImplementationOnce(() => {
    requested.resolve();
    return permission.promise;
  });
  const first = syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  await requested.promise;
  await syncRestReminder({ workoutId: 'workout-2', seconds: 30, enabled: true });
  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'evry_rest_workout-2' }));
  permission.resolve({ granted: true, canAskAgain: true } as never);
  await first;
});

it('creates both Android channels and the supplement action once', async () => {
  await syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  await syncRestReminder({ workoutId: 'workout-1', seconds: 60, enabled: true });
  expect(notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(2);
  expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith('rest', expect.objectContaining({ name: 'Descanso entre series' }));
  expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith('supplements', expect.objectContaining({ name: 'Recordatorios de suplementos' }));
  expect(notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('supplement_reminder', [
    { identifier: 'TAKEN', buttonTitle: 'Tomado', options: { opensAppToForeground: true } },
  ]);
});
