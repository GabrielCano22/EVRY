import { describe, expect, expectTypeOf, it } from 'vitest';
import { isRemoteError, remoteFromResult, type ApiFailure, type RemoteData } from './remote-data';

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

  it('maps errors, empty collections and aborted requests into UI-safe states', () => {
    const failure: ApiFailure = { status: 0, code: 'network_error', message: 'Temporal', retryable: true };
    expect(remoteFromResult({ ok: true, data: [] as string[] }, { isEmpty: (items) => items.length === 0 })).toEqual({ status: 'empty', data: [] });
    expect(isRemoteError(remoteFromResult({ ok: false, error: failure }))).toBe(true);
    expect(remoteFromResult({ ok: false, error: { ...failure, code: 'aborted', retryable: false } })).toEqual({ status: 'idle' });
  });
});
