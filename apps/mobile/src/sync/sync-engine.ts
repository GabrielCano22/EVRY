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
let syncRequested = false;

export function syncPendingWorkouts(): Promise<void> {
  syncRequested = true;
  activeSync ??= Promise.resolve().then(async () => {
    try {
      do {
        syncRequested = false;
        await performSync();
      } while (syncRequested);
    } finally {
      // Clear inside this continuation: no request can be lost between the final
      // queue check and an additional promise-finally microtask.
      activeSync = null;
    }
  });
  return activeSync;
}

async function performSync(): Promise<void> {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return;

  for (let batch = 0; batch < 10; batch += 1) {
    const rows = await pendingSyncRows();
    if (rows.length === 0) return;
    for (const row of rows) {
      if (!await markSyncAttempt(row.id)) continue;
      let response: Awaited<ReturnType<typeof syncWorkoutWithRefresh>>;
      try {
        response = await syncWorkoutWithRefresh(JSON.parse(row.payload) as SyncWorkoutInput);
      } catch {
        await markSyncFailure(row.id, row.workoutClientId, 'pending', 'network_error');
        return;
      }

      if (response.data) {
        await markSyncSuccess(row, {
          revision: response.data.revision,
          mapping: response.data.mapping,
        });
        continue;
      }

      const code = response.error?.code ?? `HTTP_${response.status}`;
      const state = nextSyncState({ status: response.status, code });
      await markSyncFailure(row.id, row.workoutClientId, state, code, response.error?.serverVersion);
      if (state === 'pending') return;
    }
  }
}
