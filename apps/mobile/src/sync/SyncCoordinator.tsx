import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncPendingWorkouts } from './sync-engine';

export function SyncCoordinator() {
  useEffect(() => {
    void syncPendingWorkouts();
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void syncPendingWorkouts();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPendingWorkouts();
    });
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
