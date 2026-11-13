import type { DatabaseOwner } from '../db/database';
import { loadUiPreference, saveUiPreference } from '../db/database';

const KEY = 'supplements_onboarding_dismissed';

export async function loadSupplementsOnboardingDismissed(owner: DatabaseOwner): Promise<boolean> {
  return (await loadUiPreference(owner, KEY)) === '1';
}

export async function dismissSupplementsOnboarding(owner: DatabaseOwner): Promise<void> {
  await saveUiPreference(owner, KEY, '1');
}
