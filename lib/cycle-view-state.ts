export type CycleLoadState = 'loading' | 'error' | 'empty' | 'success';

export function recentRecordsState(status: CycleLoadState, recordsCount: number): 'hidden' | 'empty' | 'items' {
  if (status === 'loading' || status === 'error') return 'hidden';
  return recordsCount === 0 ? 'empty' : 'items';
}
