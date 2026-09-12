'use client';

import { createEvryApiClient } from '@evry/api-client';
import type { FetchResponse } from '@evry/api-client';
import { ApiError, failureFromResponse, fetchWithSession, getAccessToken } from './api';
import { resolveApiBaseUrl } from './api-origin';

export const evryApi = createEvryApiClient(resolveApiBaseUrl(), getAccessToken, {
  fetch: fetchWithSession,
});

type SuccessfulData<Result> = Result extends { data: infer Data } ? Data : never;

export async function unwrapApiResponse<
  Responses extends Record<string | number, unknown>,
  Options,
  Media extends `${string}/${string}`,
>(operation: Promise<FetchResponse<Responses, Options, Media>>): Promise<SuccessfulData<FetchResponse<Responses, Options, Media>>> {
  try {
    const result = await operation;
    if (result.response.ok) return result.data as SuccessfulData<FetchResponse<Responses, Options, Media>>;
    throw new ApiError(failureFromResponse(result.response, result.error));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      status: 0,
      code: 'invalid_response',
      message: 'El servidor devolvió una respuesta inválida.',
      retryable: false,
    });
  }
}
