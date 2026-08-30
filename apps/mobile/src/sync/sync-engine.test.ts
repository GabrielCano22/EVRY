import NetInfo from '@react-native-community/netinfo';
import { syncWorkoutWithRefresh } from '../api/client';
import { markSyncAttempt, markSyncFailure, markSyncSuccess, pendingSyncRows } from '../db/database';
import { syncPendingWorkouts } from './sync-engine';

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('../api/client', () => ({ syncWorkoutWithRefresh: jest.fn() }));
jest.mock('../db/database', () => ({
  markSyncAttempt: jest.fn(), markSyncFailure: jest.fn(), markSyncSuccess: jest.fn(), pendingSyncRows: jest.fn(),
}));

const row = (id: number) => ({ id, syncId: `sync-${id}`, workoutClientId: 'workout-1', payload: JSON.stringify({ syncId: `sync-${id}` }), attempts: 0 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: true, isInternetReachable: true } as Awaited<ReturnType<typeof NetInfo.fetch>>);
  jest.mocked(markSyncAttempt).mockResolvedValue(true);
  jest.mocked(pendingSyncRows).mockResolvedValue([]);
});

it('does not touch the queue while offline', async () => {
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: false } as Awaited<ReturnType<typeof NetInfo.fetch>>);
  await syncPendingWorkouts();
  expect(pendingSyncRows).not.toHaveBeenCalled();
});

it('drains edits queued during a sync and shares one in-flight operation', async () => {
  jest.mocked(pendingSyncRows).mockResolvedValueOnce([row(1)]).mockResolvedValueOnce([row(2)]).mockResolvedValue([]);
  jest.mocked(syncWorkoutWithRefresh).mockResolvedValue({
    status: 200,
    data: {
      revision: 2,
      mapping: { workout: { clientId: 'workout-1', serverId: 'server-1' }, sets: [] },
      workout: { id: 'server-1', name: 'Fuerza', status: 'ACTIVE', revision: 2, sets: [], startedAt: '2026-08-30T10:00:00.000Z' },
    },
  });
  const first = syncPendingWorkouts();
  expect(syncPendingWorkouts()).toBe(first);
  await first;
  expect(syncWorkoutWithRefresh).toHaveBeenCalledTimes(2);
  expect(markSyncSuccess).toHaveBeenCalledTimes(2);
});

it('keeps a network failure pending for a later connectivity event', async () => {
  jest.mocked(pendingSyncRows).mockResolvedValueOnce([row(1)]);
  jest.mocked(syncWorkoutWithRefresh).mockRejectedValueOnce(new Error('offline'));
  await syncPendingWorkouts();
  expect(markSyncFailure).toHaveBeenCalledWith(1, 'workout-1', 'pending', 'network_error');
  expect(markSyncSuccess).not.toHaveBeenCalled();
});

it('honors a sync request arriving while an empty queue read is completing', async () => {
  jest.mocked(pendingSyncRows)
    .mockImplementationOnce(async () => {
      // A local write finished after this read's snapshot but before it returned.
      void syncPendingWorkouts();
      return [];
    })
    .mockResolvedValueOnce([row(3)])
    .mockResolvedValue([]);
  jest.mocked(syncWorkoutWithRefresh).mockResolvedValue({
    status: 200,
    data: {
      revision: 1,
      mapping: { workout: { clientId: 'workout-1', serverId: 'server-1' }, sets: [] },
      workout: { id: 'server-1', name: 'Fuerza', status: 'ACTIVE', revision: 1, sets: [], startedAt: '2026-08-30T10:00:00.000Z' },
    },
  });
  await syncPendingWorkouts();
  expect(syncWorkoutWithRefresh).toHaveBeenCalledWith({ syncId: 'sync-3' });
});
