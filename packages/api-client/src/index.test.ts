import { afterEach, expect, it, vi } from 'vitest';
import { createEvryApiClient } from './index';

afterEach(() => { vi.unstubAllGlobals(); });

it('sends generated catalog query parameters to exactly one versioned API prefix', async () => {
  let received: Request | undefined;
  vi.stubGlobal('fetch', async (request: Request) => {
    received = request;
    return new Response(JSON.stringify({ items: [], page: 2, limit: 30, total: 0, hasMore: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const client = createEvryApiClient('https://api.example.com/api/v1', () => 'test-access-token');
  const result = await client.GET('/exercises', { params: { query: { q: 'sentadilla', page: 2, limit: 30 } } });
  expect(received?.url).toBe('https://api.example.com/api/v1/exercises?q=sentadilla&page=2&limit=30');
  expect(received?.headers.get('Authorization')).toBe('Bearer test-access-token');
  expect(received?.credentials).toBe('include');
  expect(result.data).toEqual({ items: [], page: 2, limit: 30, total: 0, hasMore: false });
});

it('preserves normalized error bodies and HTTP status for both platform consumers', async () => {
  const failure = { code: 'VALIDATION_ERROR', message: 'Revisa los datos.', fieldErrors: { q: ['Búsqueda inválida'] }, retryable: false, requestId: 'fixture-request' };
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(failure), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  const client = createEvryApiClient('https://api.example.com/api/v1', () => null);
  const result = await client.GET('/exercises');
  expect(result.data).toBeUndefined();
  expect(result.response.status).toBe(400);
  expect(result.error).toEqual(failure);
});

it('allows registration without optional server-defaulted fields', async () => {
  let sent: unknown;
  vi.stubGlobal('fetch', async (request: Request) => {
    sent = await request.json();
    return Response.json({ accessToken: 'registered-token' }, { status: 201 });
  });
  const client = createEvryApiClient('https://api.example.com/api/v1', () => null);
  const result = await client.POST('/auth/register', {
    body: { email: 'person@example.invalid', password: 'long-test-password', name: 'Persona' },
  });
  expect(sent).toEqual({ email: 'person@example.invalid', password: 'long-test-password', name: 'Persona' });
  expect(result.data).toEqual({ accessToken: 'registered-token' });
});
