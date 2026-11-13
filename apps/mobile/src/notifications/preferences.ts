import type { DatabaseOwner } from '../db/database';
import { loadUiPreference, saveUiPreference } from '../db/database';

const REST_KEY = 'rest_notifications_enabled';

/** Default is on: a rest that ends while the phone is locked should still alert. */
export async function loadRestNotificationsEnabled(owner: DatabaseOwner): Promise<boolean> {
  const value = await loadUiPreference(owner, REST_KEY);
  return value === null ? true : value === '1';
}

export async function saveRestNotificationsEnabled(owner: DatabaseOwner, enabled: boolean): Promise<void> {
  await saveUiPreference(owner, REST_KEY, enabled ? '1' : '0');
}
