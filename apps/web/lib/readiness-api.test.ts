import type { components } from '@evry/api-client';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import {
  getLatestReadiness,
  saveReadiness,
  type Readiness,
  type ReadinessInput,
} from './readiness-api';

interface CapturedRequest {
  body: string | null;
  method: string;
  url: string;
}

function captureJsonRequests(responseBody: unknown) {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    requests.push({
      body: request.body ? await request.text() : null,
      method: request.method,
      url: request.url,
    });
    return Response.json(responseBody);
  }));
  return requests;
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('exports generated readiness schema aliases', () => {
  expectTypeOf<Readiness>().toEqualTypeOf<components['schemas']['Readiness']>();
  expectTypeOf<ReadinessInput>().toEqualTypeOf<components['schemas']['ReadinessInput']>();
});

it('uses generated readiness routes and preserves nullable input values', async () => {
  const requests = captureJsonRequests(null);

  await getLatestReadiness();
  await saveReadiness({ sleepHrs: 7.5, stress: null, soreness: 2, motivation: 4 });

  expect(requests).toEqual([
    { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/readiness/latest' },
    {
      body: '{"sleepHrs":7.5,"stress":null,"soreness":2,"motivation":4}',
      method: 'POST',
      url: 'http://localhost:4000/api/v1/readiness/checkin',
    },
  ]);
});

it('propagates readiness validation details', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'VALIDATION_ERROR',
    message: 'Revisa los campos enviados.',
    fieldErrors: { sleepHrs: ['Debe estar entre 0 y 24.'] },
    retryable: false,
    requestId: 'request-readiness_422',
  }, { status: 422 })));

  const result = saveReadiness({ sleepHrs: 25 });

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({
    status: 422,
    fieldErrors: { sleepHrs: ['Debe estar entre 0 y 24.'] },
    retryable: false,
    requestId: 'request-readiness_422',
  });
});
