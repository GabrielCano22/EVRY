import { afterEach, describe, expect, it, vi } from 'vitest';
import { request, requestOrThrow } from './api';
import { beginNewSession } from './auth-session';
import { getAccessToken, setAccessToken } from './api';

const apiUrl = 'http://localhost:4000/api/v1';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('request', () => {
  it('mantiene el access token solo en memoria', () => {
    setAccessToken('memory-only');

    expect(getAccessToken()).toBe('memory-only');
    expect(window.localStorage.getItem('evry_access')).toBeNull();
  });
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

  it.each([
    ['network_error', () => Promise.reject(new TypeError('offline'))],
    ['too_many_requests', () => Promise.resolve(jsonResponse({}, 429))],
    ['server_error', () => Promise.resolve(jsonResponse({}, 503))],
  ])('returns the temporary refresh failure (%s) instead of the original 401', async (code, refresh) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockImplementationOnce(refresh));

    const result = await request('/users/me');

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code, retryable: true }) });
  });

  it('returns a refresh 401 as an invalid session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockResolvedValueOnce(jsonResponse({}, 401)));

    await expect(request('/users/me')).resolves.toEqual({ ok: false, error: expect.objectContaining({ status: 401, code: 'unauthorized' }) });
  });

  it('cancels only the caller wait when the caller aborts after the first 401', async () => {
    const caller = new AbortController();
    let resolveRefresh!: (response: Response) => void;
    let refreshSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(jsonResponse({}, 401))
        .mockImplementationOnce((_url: string, init: RequestInit) => {
          refreshSignal = init.signal ?? undefined;
          return new Promise<Response>((resolve) => { resolveRefresh = resolve; });
        }),
    );
    const pending = request('/users/me', { signal: caller.signal });
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));
    caller.abort();
    await expect(pending).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'aborted', retryable: false }),
    });
    expect(refreshSignal?.aborted).toBe(false);
    resolveRefresh(jsonResponse({}, 401));
    await Promise.resolve();
  });

  it('normalizes a circular JSON body as a local non-retryable failure', async () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    vi.stubGlobal('fetch', vi.fn());

    await expect(request('/cycle/entries', { method: 'POST', body: circular })).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_request', retryable: false }),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not let an aborted caller cancel another caller sharing refresh', async () => {
    let resolveRefresh!: (response: Response) => void;
    const first = new AbortController();
    let originals = 0;
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).includes('/auth/refresh')) return new Promise<Response>((resolve) => { resolveRefresh = resolve; });
      originals += 1;
      return Promise.resolve(originals <= 2 ? jsonResponse({}, 401) : jsonResponse({ value: 'ok' }));
    }));
    const a = request('/a', { signal: first.signal });
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));
    const b = request<{ value: string }>('/b');
    first.abort();
    resolveRefresh(jsonResponse({ accessToken: 'fresh' }));

    await expect(a).resolves.toEqual({ ok: false, error: expect.objectContaining({ code: 'aborted' }) });
    await expect(b).resolves.toEqual({ ok: true, data: { value: 'ok' } });
  });

  it('clears a refresh 401 only for the request generation', async () => {
    const oldGeneration = beginNewSession();
    setAccessToken('old', oldGeneration);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockResolvedValueOnce(jsonResponse({}, 401)));
    await request('/users/me');
    expect(getAccessToken()).toBeNull();
  });

  it('does not clear a newer token when an old refresh finishes as 401', async () => {
    const oldGeneration = beginNewSession();
    setAccessToken('old', oldGeneration);
    let resolveRefresh!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRefresh = resolve; })));
    const pending = request('/users/me');
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));
    const newGeneration = beginNewSession();
    setAccessToken('new', newGeneration);
    resolveRefresh(jsonResponse({}, 401));
    await pending;
    expect(getAccessToken()).toBe('new');
  });
});
