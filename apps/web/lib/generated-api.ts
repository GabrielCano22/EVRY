'use client';

import { createEvryApiClient } from '@evry/api-client';
import { ApiError, failureFromResponse, fetchWithSession, getAccessToken } from './api';
import { resolveApiBaseUrl } from './api-origin';

export const evryApi = createEvryApiClient(resolveApiBaseUrl(), getAccessToken, {
  fetch: fetchWithSession,
});

interface GeneratedOperation<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

export async function unwrapApiResponse<T>(operation: Promise<GeneratedOperation<T>>): Promise<T> {
  const result = await operation;
  if (result.response.ok) return result.data as T;
  throw new ApiError(failureFromResponse(result.response, result.error));
}
