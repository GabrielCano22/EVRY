import type { components } from '@evry/api-client';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import {
  getExerciseProgress,
  getProgressActivity,
  getProgressOverview,
  type ExerciseProgress,
  type ProgressActivity,
  type ProgressOverview,
  type ProgressPeriod,
} from './progress-api';

interface CapturedRequest {
  method: string;
  url: string;
}

function captureJsonRequests(responseBody: unknown = {}) {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push({ method: request.method, url: request.url });
    return Response.json(responseBody);
  }));
  return requests;
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('exports generated progress schema aliases', () => {
  expectTypeOf<ProgressOverview>().toEqualTypeOf<components['schemas']['ProgressOverview']>();
  expectTypeOf<ProgressActivity>().toEqualTypeOf<components['schemas']['ProgressActivity']>();
  expectTypeOf<ExerciseProgress>().toEqualTypeOf<components['schemas']['ExerciseProgress']>();
  expectTypeOf<ProgressPeriod>().toEqualTypeOf<components['schemas']['ProgressPeriodWindow']['key']>();
});

it('sends progress periods, civil ranges, cursors and encoded ids through generated routes', async () => {
  const requests = captureJsonRequests();

  await getProgressOverview('90d');
  await getProgressActivity({ from: '2026-08-01', to: '2026-08-31' });
  await getExerciseProgress('exercise/press 1', {
    period: '6m',
    cursor: 'cursor/next page',
    limit: 20,
  });

  expect(requests).toEqual([
    { method: 'GET', url: 'http://localhost:4000/api/v1/progress/overview?period=90d' },
    { method: 'GET', url: 'http://localhost:4000/api/v1/progress/activity?from=2026-08-01&to=2026-08-31' },
    { method: 'GET', url: 'http://localhost:4000/api/v1/progress/exercises/exercise%2Fpress%201?period=6m&cursor=cursor%2Fnext%20page&limit=20' },
  ]);
});

it('propagates progress errors instead of fabricating zero metrics', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'PROGRESS_UNAVAILABLE',
    message: 'No pudimos calcular el progreso.',
    retryable: true,
    requestId: 'request-progress_503',
  }, { status: 503 })));

  const result = getProgressOverview('30d');

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({
    status: 503,
    code: 'PROGRESS_UNAVAILABLE',
    retryable: true,
    requestId: 'request-progress_503',
  });
});
