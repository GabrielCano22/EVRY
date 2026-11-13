import * as Notifications from 'expo-notifications';
import { REST_CHANNEL_ID, ensureNotificationChannels } from './channels';
import { ensureNotificationPermission, hasNotificationPermission } from './permissions';

const identifierFor = (workoutId: string) => `evry_rest_${workoutId}`.replace(/[^A-Za-z0-9_-]/g, '_');

// Use the native identifier as the key: sanitized workout IDs can collide.
const operations = new Map<string, { tail: Promise<void>; version: number }>();

function enqueue(workoutId: string, work: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
  const identifier = identifierFor(workoutId);
  let state = operations.get(identifier);
  if (!state) {
    state = { tail: Promise.resolve(), version: 0 };
    operations.set(identifier, state);
  }
  const currentState = state;
  const version = ++state.version;
  const result = state.tail.catch(() => undefined).then(() => work(() => currentState.version === version));
  state.tail = result;
  void result.finally(() => {
    if (currentState.tail === result) operations.delete(identifier);
  }).catch(() => undefined);
  return result;
}

async function clearReminder(workoutId: string): Promise<void> {
  const identifier = identifierFor(workoutId);
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    Notifications.dismissNotificationAsync(identifier).catch(() => undefined),
  ]);
}

/**
 * Cancels both the scheduled request and an already presented notification.
 * The identifier is deterministic, so a process restart never leaves two
 * competing rest alerts for the same workout.
 */
export async function cancelRestReminder(workoutId: string): Promise<void> {
  await enqueue(workoutId, () => clearReminder(workoutId));
}

export interface RestReminderInput {
  workoutId: string;
  seconds: number;
  exerciseName?: string | null;
  enabled: boolean;
  /** Only the first rest of a workout asks for the system permission. */
  requestPermission?: boolean;
}

/**
 * Keeps exactly one native rest alert per workout. It is safe to call on
 * every timer transition: the previous request is always cancelled first.
 */
export async function syncRestReminder(input: RestReminderInput): Promise<void> {
  await enqueue(input.workoutId, async (isCurrent) => {
    if (!isCurrent()) return;
    await clearReminder(input.workoutId);
    if (!isCurrent()) return;
    if (!input.enabled || !Number.isFinite(input.seconds) || input.seconds <= 0) return;
    const granted = input.requestPermission
      ? await ensureNotificationPermission()
      : await hasNotificationPermission();
    if (!granted || !isCurrent()) return;
    await ensureNotificationChannels();
    if (!isCurrent()) return;
    const name = input.exerciseName?.trim();
    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(input.workoutId),
      content: {
        title: 'Descanso terminado',
        body: name ? `${name}: empieza la siguiente serie.` : 'Empieza la siguiente serie.',
        sound: 'default',
        data: { kind: 'rest', workoutId: input.workoutId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + input.seconds * 1000),
        channelId: REST_CHANNEL_ID,
      },
    });
  });
}
