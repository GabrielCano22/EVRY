import type { ApiFailure } from './api';

export type { ApiFailure } from './api';

export type RemoteData<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: ApiFailure; staleData?: T }
  | { status: 'empty'; data: T }
  | { status: 'success'; data: T };
