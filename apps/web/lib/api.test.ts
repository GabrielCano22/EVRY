import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithSession, request, requestOrThrow } from './api';
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

  it.each([
    ['GET', '/users/me', undefined],
    ['POST', '/readiness/check-ins', { sleepHrs: 7, stress: 3 }],
  ] as const)('starts a legacy %s transport before yielding to its caller', async (method, path, body) => {
    const network = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', network);

    const pending = request(path, { method, body });

    expect(network).toHaveBeenCalledTimes(1);
    await pending;
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

describe('fetchWithSession', () => {
  it('keeps its timeout active after headers arrive while the response body stalls', async () => {
    vi.useFakeTimers();
    let bodyController!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        bodyController = controller;
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    let failure: unknown;
    const pending = fetchWithSession(new Request(`${apiUrl}/exercises`), { timeoutMs: 10 })
      .then((response) => response.json())
      .catch((error: unknown) => { failure = error; });

    try {
      await vi.advanceTimersByTimeAsync(10);
      await Promise.resolve();

      expect(failure).toBeInstanceOf(Error);
      expect(failure).toMatchObject({ name: 'ApiError', code: 'timeout', retryable: true });
    } finally {
      try { bodyController.close(); } catch { /* The fixed transport cancels the stalled body. */ }
      await pending;
    }
  });

  it('keeps caller cancellation active after headers arrive while the response body stalls', async () => {
    const caller = new AbortController();
    let bodyController!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        bodyController = controller;
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    let failure: unknown;
    const pending = fetchWithSession(new Request(`${apiUrl}/exercises`, { signal: caller.signal }))
      .then((response) => response.json())
      .catch((error: unknown) => { failure = error; });

    try {
      caller.abort();
      await vi.waitFor(() => {
        expect(failure).toBeInstanceOf(Error);
        expect(failure).toMatchObject({ name: 'ApiError', code: 'aborted', retryable: false });
      });
    } finally {
      try { bodyController.close(); } catch { /* The fixed transport cancels the stalled body. */ }
      await pending;
    }
  });

  it('preserves the request body and returns the original successful response', async () => {
    setAccessToken('current-token');
    let received: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      received = input instanceof Request ? input : new Request(input, init);
      return new Response(JSON.stringify({ id: 'workout-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json', 'x-response-marker': 'kept' },
      });
    }));
    const input = new Request(`${apiUrl}/workouts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', authorization: 'Bearer current-token' },
      body: JSON.stringify({ name: 'Fuerza' }),
    });

    const response = await fetchWithSession(input);

    expect(response.status).toBe(201);
    expect(response.headers.get('x-response-marker')).toBe('kept');
    expect(await response.json()).toEqual({ id: 'workout-1' });
    expect(received?.method).toBe('POST');
    expect(received?.credentials).toBe('include');
    expect(received?.headers.get('authorization')).toBe('Bearer current-token');
    expect(await received?.clone().json()).toEqual({ name: 'Fuerza' });
  });

  it('rotates once after a protected 401 and retries with the fresh token', async () => {
    setAccessToken('expired-token');
    const calls: Request[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      calls.push(request.clone());
      if (new URL(request.url).pathname.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'fresh-token' });
      }
      if (calls.filter((call) => new URL(call.url).pathname.endsWith('/workouts')).length === 1) {
        return jsonResponse({ code: 'UNAUTHORIZED' }, 401);
      }
      return jsonResponse({ id: 'workout-1' }, 201);
    }));

    const response = await fetchWithSession(new Request(`${apiUrl}/workouts`, {
      method: 'POST',
      headers: { authorization: 'Bearer expired-token', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Fuerza' }),
    }));

    expect(response.status).toBe(201);
    expect(calls.filter((call) => new URL(call.url).pathname.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(calls.at(-1)?.headers.get('authorization')).toBe('Bearer fresh-token');
    expect(await calls.at(-1)?.json()).toEqual({ name: 'Fuerza' });
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('shares one refresh between concurrent protected requests', async () => {
    setAccessToken('expired-token');
    let releaseRefresh!: (response: Response) => void;
    let refreshCalls = 0;
    const protectedCalls = new Map<string, number>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const pathname = new URL(request.url).pathname;
      if (pathname.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return new Promise<Response>((resolve) => { releaseRefresh = resolve; });
      }
      const count = (protectedCalls.get(pathname) ?? 0) + 1;
      protectedCalls.set(pathname, count);
      return count === 1 ? jsonResponse({}, 401) : jsonResponse({ path: pathname });
    }));

    const first = fetchWithSession(new Request(`${apiUrl}/workouts`, { headers: { authorization: 'Bearer expired-token' } }));
    const second = fetchWithSession(new Request(`${apiUrl}/routines`, { headers: { authorization: 'Bearer expired-token' } }));
    await vi.waitFor(() => expect(releaseRefresh).toBeTypeOf('function'));
    releaseRefresh(jsonResponse({ accessToken: 'fresh-token' }));

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(refreshCalls).toBe(1);
  });

  it('returns an unauthenticated 401 without trying refresh', async () => {
    const network = vi.fn().mockResolvedValue(jsonResponse({ code: 'UNAUTHORIZED' }, 401));
    vi.stubGlobal('fetch', network);

    const response = await fetchWithSession(new Request(`${apiUrl}/auth/login`, { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('propagates caller cancellation as a normalized ApiError', async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      receivedSignal = request.signal;
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    }));
    const pending = fetchWithSession(new Request(`${apiUrl}/workouts`, {
      signal: controller.signal,
      headers: { authorization: 'Bearer token' },
    }));

    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'aborted', retryable: false });
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('normalizes caller cancellation while the legacy response body is being consumed', async () => {
    const caller = new AbortController();
    let bodyController!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        bodyController = controller;
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const pending = request('/users/me', { signal: caller.signal });

    try {
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      caller.abort();

      await expect(pending).resolves.toEqual({
        ok: false,
        error: expect.objectContaining({ code: 'aborted', retryable: false }),
      });
    } finally {
      try { bodyController.close(); } catch { /* Cancellation already closed the source. */ }
      await pending.catch(() => undefined);
    }
  });
});
