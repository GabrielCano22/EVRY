import type { components } from '@evry/api-client';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import { evryApi, unwrapApiResponse } from './generated-api';

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('unwraps typed generated-client data through the authenticated web transport', async () => {
  setAccessToken('memory-token');
  let received: Request | undefined;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    received = input instanceof Request ? input : new Request(input, init);
    return Response.json({ items: [], page: 1, limit: 30, total: 0, hasMore: false });
  }));

  const result = await unwrapApiResponse(evryApi.GET('/exercises', {
    params: { query: { page: 1, limit: 30 } },
  }));

  expectTypeOf(result).toEqualTypeOf<components['schemas']['ExercisePageDto']>();
  expect(result).toEqual({ items: [], page: 1, limit: 30, total: 0, hasMore: false });
  expect(received?.url).toBe('http://localhost:4000/api/v1/exercises?page=1&limit=30');
  expect(received?.headers.get('authorization')).toBe('Bearer memory-token');
});

it('throws a normalized structured failure with its safe request id', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'ACTIVE_WORKOUT_CONFLICT',
    message: 'Ya existe una sesión activa.',
    fieldErrors: { name: ['Revisa el nombre.'] },
    retryable: false,
    requestId: 'request-safe_123',
  }, { status: 409 })));

  const operation = evryApi.POST('/workouts', { body: { name: 'Fuerza' } });

  await expect(unwrapApiResponse(operation)).rejects.toEqual(expect.objectContaining({
    status: 409,
    code: 'ACTIVE_WORKOUT_CONFLICT',
    message: 'Ya existe una sesión activa.',
    fieldErrors: { name: ['Revisa el nombre.'] },
    retryable: false,
    requestId: 'request-safe_123',
  }));
});

it('returns undefined for a successful no-content generated operation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

  await expect(unwrapApiResponse(evryApi.DELETE('/routines/{id}', {
    params: { path: { id: 'routine-1' } },
  }))).resolves.toBeUndefined();
});

it('normalizes malformed successful JSON without exposing the parser failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"items":', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));

  const operation = evryApi.GET('/exercises', {
    params: { query: { page: 1, limit: 30 } },
  });

  await expect(unwrapApiResponse(operation)).rejects.toMatchObject({
    name: 'ApiError',
    status: 0,
    code: 'invalid_response',
    retryable: false,
  });
});

it('preserves an ApiError rejected by the generated operation', async () => {
  const expected = new ApiError({
    status: 0,
    code: 'timeout',
    message: 'La solicitud tardó demasiado. Inténtalo de nuevo.',
    retryable: true,
  });
  const operation = Promise.reject(expected) as ReturnType<typeof evryApi.GET>;

  await expect(unwrapApiResponse(operation)).rejects.toBe(expected);
});
