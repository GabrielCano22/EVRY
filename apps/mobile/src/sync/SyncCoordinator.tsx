import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTrainingStore } from '../training/training-store';
import { syncPendingWorkouts } from './sync-engine';
import { useSessionStore } from '../auth/session-store';
import { isCurrentMobileSession, type MobileSession } from '../api/client';

async function synchronize(session: MobileSession) {
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
  useEffect(() => {
    if (!session || !ready) return;
    void synchronize(session);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void synchronize(session);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize(session);
    });
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [session, ready]);

  return null;
}
