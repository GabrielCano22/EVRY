import * as Notifications from 'expo-notifications';
import { resetNotificationChannelsForTests } from './channels';
import { expoWeekday, syncSupplementReminders } from './supplement-reminders';
import type { Supplement } from '../supplements/supplement';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));

const notifications = jest.mocked(Notifications);

const supplement = (overrides: Partial<Supplement> = {}): Supplement => ({
  id: 'supplement-1',
  name: 'Creatina',
  dosage: '5 g',
  notes: null,
  reminderEnabled: true,
  reminderTime: '08:30',
  reminderWeekdays: [1, 7],
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  resetNotificationChannelsForTests();
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([] as never);
  notifications.getPresentedNotificationsAsync.mockResolvedValue([] as never);
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
});

it('serializes interleaved rebuilds and recovers after a scheduling failure', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  notifications.scheduleNotificationAsync.mockImplementationOnce(async () => {
    await blocked;
    throw new Error('native failure');
  });
  const first = syncSupplementReminders([supplement({ reminderWeekdays: [1] })]);
  const second = syncSupplementReminders([supplement({ name: 'Otro', reminderWeekdays: [1] })]);
  while (!notifications.scheduleNotificationAsync.mock.calls.length) await Promise.resolve();
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  release();
  await expect(first).rejects.toThrow('native failure');
  await expect(second).resolves.toMatchObject({ scheduled: 1 });
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
});

it('cleans up after logout during scheduling and dismisses only supplement notifications', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  let current = true;
  notifications.scheduleNotificationAsync.mockImplementationOnce(async () => { await blocked; return 'old'; });
  notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([] as never).mockResolvedValueOnce([
    { identifier: 'old', content: { data: { kind: 'supplement' } } },
  ] as never);
  notifications.getPresentedNotificationsAsync.mockResolvedValue([
    { request: { identifier: 'visible-old', content: { data: { kind: 'supplement' } } } },
    { request: { identifier: 'rest', content: { data: { kind: 'rest' } } } },
  ] as never);
  const first = syncSupplementReminders([supplement()], { isCurrent: () => current });
  while (!notifications.scheduleNotificationAsync.mock.calls.length) await Promise.resolve();
  current = false;
  const logout = syncSupplementReminders([], { dismissPresented: true });
  release();
  await Promise.all([first, logout]);
  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old');
  expect(notifications.dismissNotificationAsync).toHaveBeenCalledWith('visible-old');
  expect(notifications.dismissNotificationAsync).not.toHaveBeenCalledWith('rest');
});

it.each([
  ['scheduled enumeration', 'getAllScheduledNotificationsAsync'],
  ['scheduled cancellation', 'cancelScheduledNotificationAsync'],
  ['presented enumeration', 'getPresentedNotificationsAsync'],
  ['presented dismissal', 'dismissNotificationAsync'],
] as const)('reports %s failures and permits an explicit cleanup retry', async (_label, method) => {
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'scheduled', content: { data: { kind: 'supplement' } } },
  ] as never);
  notifications.getPresentedNotificationsAsync.mockResolvedValue([
    { request: { identifier: 'presented', content: { data: { kind: 'supplement' } } } },
  ] as never);
  notifications[method].mockRejectedValueOnce(new Error('cleanup failed'));

  await expect(syncSupplementReminders([], { dismissPresented: true })).rejects.toThrow('cleanup failed');
  // Both kinds of cleanup are attempted even when one fails.
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(notifications.getPresentedNotificationsAsync).toHaveBeenCalledTimes(1);
  await expect(syncSupplementReminders([], { dismissPresented: true })).resolves.toEqual({
    scheduled: 0, permissionGranted: true,
  });
  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('scheduled');
  expect(notifications.dismissNotificationAsync).toHaveBeenCalledWith('presented');
});

it('waits for all cleanup operations before starting a queued retry', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'first', content: { data: { kind: 'supplement' } } },
    { identifier: 'second', content: { data: { kind: 'supplement' } } },
  ] as never);
  notifications.cancelScheduledNotificationAsync
    .mockRejectedValueOnce(new Error('cancel failed'))
    .mockImplementationOnce(async () => { await blocked; });
  const first = syncSupplementReminders([]);
  const retry = syncSupplementReminders([]);
  while (notifications.cancelScheduledNotificationAsync.mock.calls.length < 2) await Promise.resolve();
  await Promise.resolve();
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  release();
  await expect(first).rejects.toThrow('cancel failed');
  await expect(retry).resolves.toMatchObject({ scheduled: 0 });
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
});

it('converts ISO weekdays to Expo weekdays, with Sunday as 1', () => {
  expect([1, 2, 3, 4, 5, 6, 7].map(expoWeekday)).toEqual([2, 3, 4, 5, 6, 7, 1]);
});

it('schedules one weekly trigger per supplement and weekday', async () => {
  await syncSupplementReminders([supplement()]);

  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  const requests = notifications.scheduleNotificationAsync.mock.calls.map(([request]) => request);
  expect(requests.map((request) => request.identifier)).toEqual([
    'evry_supplement_supplement-1_1',
    'evry_supplement_supplement-1_7',
  ]);
  expect(requests[0].content).toMatchObject({
    title: 'Recordatorio de suplemento',
    body: 'Marca «Tomado» cuando lo hayas hecho.',
    categoryIdentifier: 'supplement_reminder',
    data: { kind: 'supplement', supplementId: 'supplement-1', isoWeekday: 1 },
  });
  expect(requests.map((request) => request.trigger)).toEqual([
    { type: 'weekly', weekday: 2, hour: 8, minute: 30, channelId: 'supplements' },
    { type: 'weekly', weekday: 1, hour: 8, minute: 30, channelId: 'supplements' },
  ]);
});

it('removes stale supplement requests without touching rest alerts', async () => {
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'evry_supplement_old_1', content: { data: { kind: 'supplement' } } },
    { identifier: 'evry_rest_workout-1', content: { data: { kind: 'rest' } } },
  ] as never);

  await syncSupplementReminders([supplement({ reminderWeekdays: [1] })]);

  expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('evry_supplement_old_1');
  expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('evry_rest_workout-1');
});

it('skips supplements without a complete reminder configuration', async () => {
  await syncSupplementReminders([
    supplement({ id: 'off', reminderEnabled: false }),
    supplement({ id: 'no-time', reminderTime: null }),
    supplement({ id: 'no-days', reminderWeekdays: [] }),
    supplement({ id: 'bad-time', reminderTime: '8:30' }),
  ]);
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('cleans up and returns early when nothing is configured', async () => {
  const result = await syncSupplementReminders([]);
  expect(result).toEqual({ scheduled: 0, permissionGranted: true });
  expect(notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
});

it('does not schedule without notification permission', async () => {
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
  const result = await syncSupplementReminders([supplement()]);
  expect(result).toEqual({ scheduled: 0, permissionGranted: false });
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('requests permission only when the caller asks for it', async () => {
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
  const result = await syncSupplementReminders([supplement()], { requestPermission: true });
  expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(result.scheduled).toBe(2);
});
