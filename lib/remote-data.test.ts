import { describe, expectTypeOf, it } from 'vitest';
import type { ApiFailure, RemoteData } from './remote-data';

describe('RemoteData', () => {
  it('supports idle, loading, empty, success and error with stale data', () => {
    const failure: ApiFailure = { status: 503, code: 'server_error', message: 'Temporal', retryable: true };
    const states: RemoteData<string[]>[] = [
      { status: 'idle' },
      { status: 'loading' },
      { status: 'empty', data: [] },
      { status: 'success', data: ['workout'] },
      { status: 'error', error: failure, staleData: ['workout'] },
    ];

    expectTypeOf(states).toMatchTypeOf<RemoteData<string[]>[]>();
  });
});
