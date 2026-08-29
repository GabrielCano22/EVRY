import type { ApiFailure } from './api';

export type { ApiFailure } from './api';

export type RemoteData<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: ApiFailure; staleData?: T }
  | { status: 'empty'; data: T }
  | { status: 'success'; data: T };

export function remoteFromResult<T>(
  result: import('./api').ApiResult<T>,
  options: { isEmpty?: (data: T) => boolean; staleData?: T } = {},
): RemoteData<T> {
  if (!result.ok) {
    if (result.error.code === 'aborted') return options.staleData === undefined ? { status: 'idle' } : { status: 'success', data: options.staleData };
    return { status: 'error', error: result.error, staleData: options.staleData };
  }
  return options.isEmpty?.(result.data) ? { status: 'empty', data: result.data } : { status: 'success', data: result.data };
}

export function isRemoteError<T>(state: RemoteData<T>): state is Extract<RemoteData<T>, { status: 'error' }> {
  return state.status === 'error';
}
