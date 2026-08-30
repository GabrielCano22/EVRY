import { aggregateSyncState, nextSyncState } from './queue-policy';

describe('nextSyncState', () => {
  it('marks revision and active-workout conflicts for human review', () => {
    expect(nextSyncState({ status: 409, code: 'REVISION_CONFLICT' })).toBe('requires_review');
    expect(nextSyncState({ status: 409, code: 'ACTIVE_WORKOUT_CONFLICT' })).toBe('requires_review');
  });

  it('retries temporary failures but stops retrying invalid payloads', () => {
    expect(nextSyncState({ status: 0, code: 'network_error' })).toBe('pending');
    expect(nextSyncState({ status: 503, code: 'SERVICE_UNAVAILABLE' })).toBe('pending');
    expect(nextSyncState({ status: 400, code: 'VALIDATION_ERROR' })).toBe('requires_review');
  });
});

describe('aggregateSyncState', () => {
  it('surfaces review conflicts before transient or completed work', () => {
    expect(aggregateSyncState(['synced', 'pending', 'requires_review'])).toBe('requires_review');
    expect(aggregateSyncState(['synced', 'syncing', 'pending'])).toBe('syncing');
  });

  it('reports synced when there is no queued work', () => {
    expect(aggregateSyncState([])).toBe('synced');
  });
});
