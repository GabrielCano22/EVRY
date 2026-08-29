import NetInfo from '@react-native-community/netinfo';
import type { SyncWorkoutInput } from '../api/client';
import { syncWorkoutWithRefresh } from '../api/client';
import {
  markSyncAttempt,
  markSyncFailure,
  markSyncSuccess,
  pendingSyncRows,
} from '../db/database';
import { nextSyncState } from './queue-policy';

let activeSync: Promise<void> | null = null;

export function syncPendingWorkouts(): Promise<void> {
  activeSync ??= performSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function performSync(): Promise<void> {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return;

  for (const row of await pendingSyncRows()) {
    await markSyncAttempt(row.id);
    let response: Awaited<ReturnType<typeof syncWorkoutWithRefresh>>;
    try {
      response = await syncWorkoutWithRefresh(JSON.parse(row.payload) as SyncWorkoutInput);
    } catch {
      await markSyncFailure(row.id, row.workoutClientId, 'pending', 'network_error');
      return;
    }

    if (response.data) {
      const mapping = response.data.mapping as {
        workout: { serverId: string };
        sets?: { clientId: string; serverId: string }[];
      };
      await markSyncSuccess(row, {
        revision: response.data.revision,
        mapping,
      });
      continue;
    }

    const code = response.error?.code ?? `HTTP_${response.status}`;
    const state = nextSyncState({ status: response.status, code });
    await markSyncFailure(row.id, row.workoutClientId, state, code);
    if (state === 'pending') return;
  }
}
