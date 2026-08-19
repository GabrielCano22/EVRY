import { afterEach, describe, expect, it, vi } from 'vitest';
import { request, requestOrThrow } from './api';

const apiUrl = 'http://localhost:4000/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('request', () => {
  it('returns a discriminated success result for a JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ id: 'user-1' })));

    await expect(request<{ id: string }>('/users/me')).resolves.toEqual({
      ok: true,
      data: { id: 'user-1' },
    });
    expect(fetch).toHaveBeenCalledWith(`${apiUrl}/users/me`, expect.objectContaining({ credentials: 'include' }));
  });

  it('keeps an empty successful body as undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(request<void>('/health', { auth: false })).resolves.toEqual({ ok: true, data: undefined });
  });

  it('normalizes invalid JSON without exposing the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>SELECT * FROM users</html>', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const result = await request('/health', { auth: false });
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_response', retryable: false }),
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/html|select|users/i);
  });

  it.each([
    [401, 'unauthorized', false],
    [429, 'too_many_requests', true],
    [500, 'server_error', true],
  ])('normalizes HTTP %i safely', async (status, code, retryable) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: '<strong>SQLSTATE: leaked internal query</strong>', fieldErrors: { email: ['Invalido'] } }, status),
      ),
    );

    const result = await request('/protected', { auth: false });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ status, code, retryable }),
    });
    if (!result.ok) {
      expect(result.error.message).not.toMatch(/sqlstate|query|strong/i);
      expect(result.error.fieldErrors).toEqual({ email: ['Invalido'] });
    }
  });

  it('normalizes network failures as retryable without leaking their message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('connect ECONNREFUSED postgres')));

    const result = await request('/health', { auth: false });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'network_error', status: 0, retryable: true }),
    });
    if (!result.ok) expect(result.error.message).not.toMatch(/econnrefused|postgres/i);
  });

  it('classifies its own timeout as retryable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        }),
      ),
    );

    const pending = request('/slow', { auth: false, timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(10);

    await expect(pending).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'timeout', retryable: true }),
    });
  });

  it('forwards an external AbortSignal and classifies intentional cancellation as non-retryable', async () => {
    let receivedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        receivedSignal = init.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }),
    );
    const controller = new AbortController();
    const pending = request('/cancel', { auth: false, signal: controller.signal, timeoutMs: 1000 });

    controller.abort();

    await expect(pending).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'aborted', retryable: false }),
    });
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('throws the normalized failure only through requestOrThrow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'No autorizado' }, 401)));

    await expect(requestOrThrow('/protected', { auth: false })).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      retryable: false,
    });
  });
});
