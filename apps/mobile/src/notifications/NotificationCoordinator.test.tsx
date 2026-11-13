import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSessionStore } from '../auth/session-store';
import { recordIntakeFromNotification, useSupplementsStore } from '../supplements/store';
import { syncSupplementReminders } from './supplement-reminders';
import { NotificationCoordinator } from './NotificationCoordinator';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));
jest.mock('./channels', () => ({ SUPPLEMENT_TAKEN_ACTION: 'taken', ensureNotificationChannels: jest.fn(async () => undefined) }));
jest.mock('./supplement-reminders', () => ({ syncSupplementReminders: jest.fn(async () => ({ scheduled: 0, permissionGranted: true })) }));
jest.mock('../auth/session-store', () => {
  const { create } = jest.requireActual('zustand');
  return { useSessionStore: create(() => ({ session: null })) };
});
jest.mock('../supplements/store', () => {
  const { create } = jest.requireActual('zustand');
  return { useSupplementsStore: create(() => ({ session: null, supplements: [], ready: false, load: jest.fn(), reset: jest.fn() })), recordIntakeFromNotification: jest.fn() };
});

it('cleans up on account changes and never synchronizes the previous account state', async () => {
  const alice = { userId: 'alice', serverUrl: 'https://example.test', version: 1 };
  const bob = { ...alice, userId: 'bob', version: 2 };
  const oldSupplements = [{ id: 'alice-private' }] as never;
  useSessionStore.setState({ session: alice });
  useSupplementsStore.setState({ session: alice, supplements: oldSupplements, ready: true });
  const view = await render(<NotificationCoordinator />);
  await waitFor(() => expect(syncSupplementReminders).toHaveBeenCalledWith(oldSupplements, expect.any(Object)));
  const oldOptions = jest.mocked(syncSupplementReminders).mock.calls.find(([items]) => items === oldSupplements)![1]!;
  jest.mocked(syncSupplementReminders).mockClear();

  await act(() => { useSessionStore.setState({ session: bob }); });
  expect(oldOptions.isCurrent?.()).toBe(false);
  expect(syncSupplementReminders).toHaveBeenCalledWith([], { dismissPresented: true });
  expect(syncSupplementReminders).not.toHaveBeenCalledWith(oldSupplements, expect.any(Object));

  jest.mocked(syncSupplementReminders).mockClear();
  await act(() => { useSessionStore.setState({ session: null }); });
  expect(syncSupplementReminders).toHaveBeenCalledWith([], { dismissPresented: true });
  await view.unmount();
});

it('logs cleanup failures without sensitive details and retries once per foreground event', async () => {
  let onChange!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;
    return { remove };
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const sync = jest.mocked(syncSupplementReminders);
  sync.mockClear();
  useSessionStore.setState({ session: null });
  useSupplementsStore.setState({ session: null, supplements: [], ready: false });
  sync.mockRejectedValueOnce(new Error('private supplement name'));
  const view = await render(<NotificationCoordinator />);
  await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
  expect(warn.mock.calls.flat().join(' ')).not.toContain('private supplement name');
  expect(sync).toHaveBeenCalledTimes(1);

  sync.mockRejectedValueOnce(new Error('another private detail'));
  await act(async () => { onChange('background'); onChange('active'); });
  expect(sync).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalledTimes(2);
  await act(async () => { onChange('active'); });
  expect(sync).toHaveBeenCalledTimes(3);
  await act(async () => { onChange('active'); });
  expect(sync).toHaveBeenCalledTimes(3);
  await view.unmount();
  expect(remove).toHaveBeenCalled();
  listener.mockRestore();
  warn.mockRestore();
});

it('restores the current account reminders after a successful foreground cleanup retry', async () => {
  let onChange!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;
    return { remove: jest.fn() };
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const sync = jest.mocked(syncSupplementReminders);
  sync.mockClear();
  const session = { userId: 'bob', serverUrl: 'https://example.test', version: 2 };
  const supplements = [{ id: 'bob-reminder' }] as never;
  useSessionStore.setState({ session });
  useSupplementsStore.setState({ session, supplements, ready: true });
  sync.mockRejectedValueOnce(new Error('cleanup failed'));
  const view = await render(<NotificationCoordinator />);
  await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
  sync.mockClear();
  await act(async () => { onChange('active'); });
  expect(sync).toHaveBeenNthCalledWith(1, [], { dismissPresented: true });
  expect(sync).toHaveBeenNthCalledWith(2, supplements, expect.objectContaining({ isCurrent: expect.any(Function) }));
  await view.unmount();
  listener.mockRestore();
  warn.mockRestore();
});

it('retries a failed logout cleanup when the app returns to foreground', async () => {
  let onChange!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;
    return { remove: jest.fn() };
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const sync = jest.mocked(syncSupplementReminders);
  sync.mockClear();
  const session = { userId: 'alice', serverUrl: 'https://example.test', version: 1 };
  useSessionStore.setState({ session });
  useSupplementsStore.setState({ session, supplements: [], ready: false });
  const view = await render(<NotificationCoordinator />);
  sync.mockClear();
  sync.mockRejectedValueOnce(new Error('sensitive'));
  await act(async () => { useSessionStore.setState({ session: null }); });
  expect(warn).toHaveBeenCalledTimes(1);
  await act(async () => { onChange('active'); });
  expect(sync).toHaveBeenCalledTimes(2);
  expect(sync).toHaveBeenLastCalledWith([], { dismissPresented: true });
  await view.unmount();
  listener.mockRestore();
  warn.mockRestore();
});

it('retries a failed rebuild using only the current session and current supplements', async () => {
  let onChange!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;
    return { remove: jest.fn() };
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const sync = jest.mocked(syncSupplementReminders);
  sync.mockClear();
  const session = { userId: 'alice', serverUrl: 'https://example.test', version: 1 };
  const first = [{ id: 'first' }] as never;
  const latest = [{ id: 'latest' }] as never;
  useSessionStore.setState({ session });
  useSupplementsStore.setState({ session, supplements: first, ready: true });
  sync.mockResolvedValueOnce({ scheduled: 0, permissionGranted: true });
  sync.mockRejectedValueOnce(new Error('private detail'));
  const view = await render(<NotificationCoordinator />);
  await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
  expect(warn.mock.calls.flat().join(' ')).not.toContain('private detail');
  sync.mockClear();
  await act(async () => { useSupplementsStore.setState({ supplements: latest }); onChange('active'); });
  expect(sync).toHaveBeenCalledWith(latest, expect.objectContaining({ isCurrent: expect.any(Function) }));
  await view.unmount();
  listener.mockRestore();
  warn.mockRestore();
});

it('suppresses concurrent duplicate actions but retries a failed intake on redelivery', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const session = { userId: 'alice', serverUrl: 'https://example.test', version: 1 };
  useSessionStore.setState({ session });
  useSupplementsStore.setState({ session, supplements: [], ready: false });
  const record = jest.mocked(recordIntakeFromNotification);
  record.mockReset();
  jest.mocked(router.push).mockClear();
  let reject!: (reason: Error) => void;
  record.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
  record.mockResolvedValueOnce(undefined as never);
  const view = await render(<NotificationCoordinator />);
  const callback = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls.at(-1)![0];
  const response = { actionIdentifier: 'taken', notification: { date: Date.now(), request: { identifier: 'one', content: { data: { kind: 'supplement', supplementId: 's1' } } } } } as never;
  await act(async () => { callback(response); callback(response); });
  expect(record).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('failed')); });
  expect(router.push).not.toHaveBeenCalled();
  await act(async () => { callback(response); });
  expect(record).toHaveBeenCalledTimes(2);
  expect(router.push).toHaveBeenCalledTimes(1);
  await act(async () => { callback(response); });
  expect(record).toHaveBeenCalledTimes(2);
  await view.unmount();
  listener.mockRestore();
});
