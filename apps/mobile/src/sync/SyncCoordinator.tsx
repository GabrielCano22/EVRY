import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTrainingStore } from '../training/training-store';
import { pendingSyncRows } from '../db/database';
import { syncPendingWorkouts } from './sync-engine';
import { useSessionStore } from '../auth/session-store';
import { isCurrentMobileSession, type MobileSession } from '../api/client';

const flights = new WeakMap<MobileSession, { promise: Promise<void>; requested: boolean }>();
const RETRY_INTERVAL_MS = 30_000;

function synchronize(session: MobileSession): Promise<void> {
  if (!isCurrentMobileSession(session)) return Promise.resolve();
  const pending = flights.get(session);
  if (pending) {
    pending.requested = true;
    return pending.promise;
  }
  const flight = { promise: Promise.resolve(), requested: true };
  flight.promise = Promise.resolve().then(async () => {
    try {
      do {
        flight.requested = false;
        await performSynchronization(session);
      } while (flight.requested && isCurrentMobileSession(session));
    } finally {
      flights.delete(session);
    }
  });
  flights.set(session, flight);
  return flight.promise;
}

async function performSynchronization(session: MobileSession) {
  if (!isCurrentMobileSession(session)) return;
  const training = useTrainingStore.getState();
  try {
    await useSessionStore.getState().refreshUser();
    if (!isCurrentMobileSession(session)) return;
    await training.refreshSyncState();
    await syncPendingWorkouts(session);
  } catch (error) {
    if (isCurrentMobileSession(session)) useTrainingStore.setState({ error: error instanceof Error ? error.message : 'No se pudo sincronizar.' });
  } finally {
    if (isCurrentMobileSession(session)) await useTrainingStore.getState().refreshSyncState().catch(() => undefined);
  }
}

export function SyncCoordinator() {
  const session = useSessionStore((state) => state.session);
  const ready = useTrainingStore((state) => state.ready);
  const offline = useSessionStore((state) => state.offline);
  const pending = useTrainingStore((state) => state.syncState === 'pending');
  const review = useTrainingStore((state) => state.syncState === 'requires_review');
  useEffect(() => {
    if (!session || !ready) return;
    void synchronize(session);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) void synchronize(session);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize(session);
    });
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [session, ready]);

  useEffect(() => {
    if (!session || !ready || (!offline && !pending && !review)) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      if (offline || pending) {
        void synchronize(session);
        return;
      }
      // A review takes priority in the aggregate UI state, but independent
      // pending workouts must still be retried. Do not resend review rows.
      void pendingSyncRows(session).then((rows) => {
        if (rows.length && AppState.currentState === 'active' && isCurrentMobileSession(session)) {
          void synchronize(session);
        }
      }).catch((error: unknown) => {
        if (isCurrentMobileSession(session)) {
          useTrainingStore.setState({ error: error instanceof Error ? error.message : 'No se pudo revisar la cola de sincronización.' });
        }
      });
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session, ready, offline, pending, review]);

  return null;
}
