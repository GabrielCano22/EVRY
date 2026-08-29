export type SyncQueueState = 'pending' | 'syncing' | 'synced' | 'requires_review';

export interface SyncFailure {
  status: number;
  code: string;
}

const REVIEW_CODES = new Set([
  'ACTIVE_WORKOUT_CONFLICT',
  'REVISION_CONFLICT',
  'VALIDATION_ERROR',
]);

export function nextSyncState(
  failure: SyncFailure,
): Extract<SyncQueueState, 'pending' | 'requires_review'> {
  if (failure.status === 409 || REVIEW_CODES.has(failure.code)) return 'requires_review';
  if (failure.status === 0 || failure.status === 408 || failure.status === 429 || failure.status >= 500) {
    return 'pending';
  }
  return 'requires_review';
}
