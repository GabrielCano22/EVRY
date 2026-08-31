import NetInfo from '@react-native-community/netinfo';
import { isCurrentMobileSession, syncWorkoutWithRefresh, type MobileSession, type SyncWorkoutInput } from '../api/client';
import {
  markSyncAttempt,
  markSyncFailure,
  markSyncSuccess,
  pendingSyncRows,
} from '../db/database';
import { nextSyncState } from './queue-policy';

const flights = new WeakMap<MobileSession, { promise: Promise<void>; requested: boolean }>();

export function syncPendingWorkouts(session: MobileSession): Promise<void> {
  if (!session || !isCurrentMobileSession(session)) return Promise.resolve();
  const existing = flights.get(session);
  if (existing) {
    existing.requested = true;
    return existing.promise;
  }
  const flight = { requested: true, promise: Promise.resolve() };
  flight.promise = Promise.resolve().then(async () => {
    try {
      do {
        flight.requested = false;
        await performSync(session);
      } while (flight.requested && isCurrentMobileSession(session));
    } finally {
      flights.delete(session);
    }
  });
  flights.set(session, flight);
  return flight.promise;
}

async function performSync(session: MobileSession): Promise<void> {
  const network = await NetInfo.fetch();
  if (!isCurrentMobileSession(session) || !network.isConnected || network.isInternetReachable === false) return;

  for (let batch = 0; batch < 10; batch += 1) {
    if (!isCurrentMobileSession(session)) return;
    const rows = await pendingSyncRows(session);
    if (!isCurrentMobileSession(session)) return;
    if (rows.length === 0) return;
    for (const row of rows) {
      if (!isCurrentMobileSession(session)) return;
      if (!await markSyncAttempt(session, row.id)) continue;
      let response: Awaited<ReturnType<typeof syncWorkoutWithRefresh>>;
      try {
        response = await syncWorkoutWithRefresh(JSON.parse(row.payload) as SyncWorkoutInput, session);
      } catch {
        await markSyncFailure(session, row.id, row.workoutClientId, 'pending', 'network_error');
        return;
      }

      if (response.data) {
        await markSyncSuccess(session, row, {
          revision: response.data.revision,
          mapping: response.data.mapping,
        });
        continue;
      }

      const code = response.error?.code ?? `HTTP_${response.status}`;
      const state = nextSyncState({ status: response.status, code });
      await markSyncFailure(session, row.id, row.workoutClientId, state, code, response.error?.serverVersion);
      if (state === 'pending') return;
    }
  }
}
