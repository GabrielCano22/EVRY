import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTrainingStore } from '../training/training-store';
import { syncPendingWorkouts } from './sync-engine';

async function synchronize() {
  const training = useTrainingStore.getState();
  await training.refreshSyncState();
  try {
    await syncPendingWorkouts();
  } finally {
    await useTrainingStore.getState().refreshSyncState();
  }
}

export function SyncCoordinator() {
  useEffect(() => {
    void synchronize();
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void synchronize();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize();
    });
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
