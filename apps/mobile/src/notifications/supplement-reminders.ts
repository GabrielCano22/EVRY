import * as Notifications from 'expo-notifications';
import {
  SUPPLEMENTS_CHANNEL_ID,
  SUPPLEMENT_CATEGORY_ID,
  ensureNotificationChannels,
} from './channels';
import { ensureNotificationPermission, hasNotificationPermission } from './permissions';
import { isValidReminderTime, type Supplement } from '../supplements/supplement';

export interface SupplementReminderResult {
  scheduled: number;
  permissionGranted: boolean;
}

/** Expo uses 1 = Sunday; EVRY stores ISO 1 = Monday … 7 = Sunday. */
export function expoWeekday(isoWeekday: number): number {
  return (isoWeekday % 7) + 1;
}

function parseTime(value: string): { hour: number; minute: number } | null {
  if (!isValidReminderTime(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

async function cancelOwnReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await completeCleanup(scheduled
    .filter((request) => request.content.data?.kind === 'supplement')
    .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

async function dismissOwnReminders(): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await completeCleanup(presented
    .filter((notification) => notification.request.content.data?.kind === 'supplement')
    .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)));
}

// Wait for every native operation before rejecting, so a queued retry cannot
// overlap with cleanup operations that are still in flight.
async function completeCleanup(operations: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(operations);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) throw failure.reason;
}

let syncQueue: Promise<unknown> = Promise.resolve();

/**
 * Rebuilds the weekly reminder set from local state. Called after any change
 * and on startup. Without permission it only cleans up stale requests, so the
 * app never nags on launch.
 */
export function syncSupplementReminders(
  supplements: readonly Supplement[],
  options: { requestPermission?: boolean; dismissPresented?: boolean; isCurrent?: () => boolean } = {},
): Promise<SupplementReminderResult> {
  const run = () => rebuildReminders(supplements, options);
  const result = syncQueue.then(run, run);
  syncQueue = result.catch(() => undefined);
  return result;
}

async function rebuildReminders(
  supplements: readonly Supplement[],
  options: { requestPermission?: boolean; dismissPresented?: boolean; isCurrent?: () => boolean },
): Promise<SupplementReminderResult> {
  await completeCleanup([
    cancelOwnReminders(),
    ...(options.dismissPresented ? [dismissOwnReminders()] : []),
  ]);
  const active = supplements.filter((supplement) => supplement.reminderEnabled
    && supplement.reminderTime !== null && supplement.reminderWeekdays.length > 0);
  if (active.length === 0 || options.isCurrent?.() === false) return { scheduled: 0, permissionGranted: true };

  const granted = options.requestPermission
    ? await ensureNotificationPermission()
    : await hasNotificationPermission();
  if (!granted) return { scheduled: 0, permissionGranted: false };

  await ensureNotificationChannels();
  let scheduled = 0;
  for (const supplement of active) {
    const time = parseTime(supplement.reminderTime!);
    if (!time) continue;
    for (const isoWeekday of supplement.reminderWeekdays) {
      if (options.isCurrent?.() === false) return { scheduled, permissionGranted: true };
      if (!Number.isInteger(isoWeekday) || isoWeekday < 1 || isoWeekday > 7) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `evry_supplement_${supplement.id}_${isoWeekday}`.replace(/[^A-Za-z0-9_-]/g, '_'),
        content: {
          title: 'Recordatorio de suplemento',
          body: 'Marca «Tomado» cuando lo hayas hecho.',
          sound: 'default',
          categoryIdentifier: SUPPLEMENT_CATEGORY_ID,
          data: { kind: 'supplement', supplementId: supplement.id, isoWeekday },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday(isoWeekday),
          hour: time.hour,
          minute: time.minute,
          channelId: SUPPLEMENTS_CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
  }
  return { scheduled, permissionGranted: true };
}
