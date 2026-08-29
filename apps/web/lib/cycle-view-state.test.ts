import { describe, expect, it } from 'vitest';
import { recentRecordsState } from './cycle-view-state';

describe('recentRecordsState', () => {
  it.each([
    ['loading', 0, 'hidden'],
    ['error', 0, 'hidden'],
    ['empty', 0, 'empty'],
    ['success', 0, 'empty'],
    ['success', 1, 'items'],
  ] as const)('maps %s and %i records to %s', (status, count, expected) => {
    expect(recentRecordsState(status, count)).toBe(expected);
  });
});
