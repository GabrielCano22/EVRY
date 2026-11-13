import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';

export const REST_CHANNEL_ID = 'rest';
export const SUPPLEMENTS_CHANNEL_ID = 'supplements';
export const SUPPLEMENT_CATEGORY_ID = 'supplement_reminder';
export const SUPPLEMENT_TAKEN_ACTION = 'TAKEN';

let channelsReady = false;

/**
 * Android needs an explicit channel before the first notification. Both
 * channels are created together so the permission prompt and the system
 * settings screen show a coherent set of options.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (channelsReady) return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: 'Descanso entre series',
      description: 'Avisa cuando termina el descanso, incluso con la app en segundo plano.',
      importance: AndroidImportance.HIGH,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
      vibrationPattern: [0, 220, 160, 220],
      enableVibrate: true,
      showBadge: false,
      bypassDnd: false,
    }),
    Notifications.setNotificationChannelAsync(SUPPLEMENTS_CHANNEL_ID, {
      name: 'Recordatorios de suplementos',
      description: 'Recordatorios locales para los suplementos que tú configures.',
      importance: AndroidImportance.DEFAULT,
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
      bypassDnd: false,
    }),
  ]);
  await Notifications.setNotificationCategoryAsync(SUPPLEMENT_CATEGORY_ID, [
    {
      identifier: SUPPLEMENT_TAKEN_ACTION,
      buttonTitle: 'Tomado',
      // Opening the app is the only way to persist the action reliably when
      // Android has killed the process; the handler records it immediately.
      options: { opensAppToForeground: true },
    },
  ]);
  channelsReady = true;
}

/** Test seam: the next call creates the channels again. */
export function resetNotificationChannelsForTests(): void {
  channelsReady = false;
}
