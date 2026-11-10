import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RootLayout from '../app/layout';

const paths: string[] = [];
const requests: Request[] = [];
const user = { id: 'document-user', name: 'Eva', email: 'eva@example.test',
  biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01T00:00:00.000Z' };

function executeDocumentScript() {
  const html = renderToStaticMarkup(<RootLayout><span>Contenido</span></RootLayout>);
  const document = new DOMParser().parseFromString(html, 'text/html');
  // Missing early bootstrap fails on its missing observable request, not an import.
  const script = document.getElementById('evry-document-refresh');
  if (script?.textContent) window.eval(script.textContent);
}

beforeEach(() => {
  vi.resetModules();
  paths.length = 0;
  requests.length = 0;
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/dashboard');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    paths.push(path);
    if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    if (request.headers.get('authorization') !== 'Bearer document-token') {
      return Response.json({ code: 'UNAUTHORIZED', message: 'Sin sesión', retryable: false }, { status: 401 });
    }
    return Response.json(user);
  }));
});
afterEach(async () => {
  const { cancelDocumentRefresh } = await import('./document-refresh');
  cancelDocumentRefresh();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

it('starts the authenticated profile from HTML before loading the auth store and adopts it only once', async () => {
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']));
  expect(requests[1]).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
  expect(requests[1].headers.get('authorization')).toBe('Bearer document-token');
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'authenticated', usuario: user });
  expect(paths).toHaveLength(2);
  const { getCurrentUser } = await import('./auth-api');
  expect(await getCurrentUser()).toEqual(user);
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/users/me']);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

it('does not block access-token restoration on the profile body and cancels that profile on a new session', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    paths.push(new URL(request.url).pathname);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    return new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  const { restoreAccessToken, getAccessToken } = await import('./api');
  await restoreAccessToken();
  expect(getAccessToken()).toBe('document-token');
  expect(requests[1].signal.aborted).toBe(false);
  const { beginNewSession } = await import('./auth-session');
  beginNewSession();
  expect(requests[1].signal.aborted).toBe(true);
});

it('preserves a prefetched profile HTTP error without requesting it a second time', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    paths.push(new URL(request.url).pathname);
    return request.url.endsWith('/auth/refresh') ? Response.json({ accessToken: 'document-token' })
      : Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Perfil no disponible.', retryable: true }, { status: 503 });
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toHaveLength(2));
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar();
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'error', usuario: null, error: 'Perfil no disponible.' });
  expect(paths).toHaveLength(2);
});

it.each([200, 401] as const)('retries a prefetched profile 401 with one fresh rotation and preserves final HTTP %s semantics', async finalStatus => {
  let rotations = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    paths.push(new URL(request.url).pathname);
    if (request.url.endsWith('/auth/refresh')) {
      rotations++;
      return Response.json({ accessToken: rotations === 1 ? 'document-token' : 'rotated-document-token' });
    }
    if (request.headers.get('authorization') === 'Bearer rotated-document-token' && finalStatus === 200) return Response.json(user);
    return Response.json({ code: 'UNAUTHORIZED', message: 'Sin sesión', retryable: false }, { status: 401 });
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toHaveLength(2));
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(requests[1].headers.get('authorization')).toBe('Bearer document-token');
  expect(requests[3].headers.get('authorization')).toBe('Bearer rotated-document-token');
  expect(requests.filter(request => request.url.endsWith('/auth/refresh')).every(request => request.credentials === 'include')).toBe(true);
  expect(rotations).toBe(2);
  const { getAccessToken } = await import('./api');
  expect(useAutenticacion.getState()).toMatchObject(finalStatus === 200
    ? { estado: 'authenticated', usuario: user }
    : { estado: 'anonymous', usuario: null });
  expect(getAccessToken()).toBe(finalStatus === 200 ? 'rotated-document-token' : null);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

it('permits an explicit retry after prefetched profile failure without another cookie rotation or reusing the failed response', async () => {
  let profiles = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    paths.push(new URL(request.url).pathname);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    profiles++;
    return profiles === 1
      ? Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Perfil no disponible.', retryable: true }, { status: 503 })
      : Response.json(user);
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toHaveLength(2));
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'error', usuario: null, error: 'Perfil no disponible.' });
  expect(paths).toHaveLength(2);
  // Match the layout's explicit Reintentar handler. reuseForDocument is only
  // the mount-time adoption path, not a request to refresh a settled result.
  await useAutenticacion.getState().inicializar();
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'authenticated', usuario: user, error: null });
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/users/me']);
  expect(requests[2].headers.get('authorization')).toBe('Bearer document-token');
});

it('never uses the prefetched user with a different access token', async () => {
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toHaveLength(2));
  const api = await import('./api');
  await api.restoreAccessToken();
  api.setAccessToken('other-account-token');
  // The real transport rejects this distinct token; reusing the old profile
  // would incorrectly return the previous user's successful response.
  const response = await api.fetchWithSession(new Request('http://localhost:4000/api/v1/users/me'), { allowRefresh: false });
  expect(response.status).toBe(401);
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/users/me']);
});

it('does not return the document profile snapshot after saving a newer profile', async () => {
  let saved = false;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    paths.push(`${request.method} ${new URL(request.url).pathname}`);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    expect(request.headers.get('authorization')).toBe('Bearer document-token');
    if (request.method === 'PATCH') {
      expect(await request.json()).toEqual({ name: 'Eva actualizada' });
      saved = true;
    }
    return Response.json(saved ? { ...user, name: 'Eva actualizada' } : user);
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  const { restoreAccessToken, getAccessToken } = await import('./api');
  await restoreAccessToken();
  const { updateCurrentUser, getCurrentUser } = await import('./auth-api');
  expect(await updateCurrentUser({ name: 'Eva actualizada' })).toMatchObject({ name: 'Eva actualizada' });
  expect(await getCurrentUser()).toMatchObject({ id: 'document-user', name: 'Eva actualizada' });
  expect(paths).toEqual([
    'POST /api/v1/auth/refresh', 'GET /api/v1/users/me',
    'PATCH /api/v1/users/me', 'GET /api/v1/users/me',
  ]);
  expect(getAccessToken()).toBe('document-token');
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

it.each([{ accessToken: '' }, { accessToken: 123 }, { user }, null])(
  'does not prefetch protected data for an invalid refresh payload %j', async payload => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      paths.push(new URL(request.url).pathname);
      return Response.json(payload);
    }));
    executeDocumentScript();
    const { restoreAccessToken, getAccessToken } = await import('./api');
    await expect(restoreAccessToken()).rejects.toMatchObject({ code: 'invalid_response' });
    expect(getAccessToken()).toBeNull();
    expect(paths).toEqual(['/api/v1/auth/refresh']);
  },
);

it('preserves a profile network failure without an automatic duplicate request', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    paths.push(new URL(request.url).pathname);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    throw new TypeError('Synthetic connection failure');
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(paths).toHaveLength(2));
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar();
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'error', usuario: null });
  expect(useAutenticacion.getState().error).toBeTruthy();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
});

it('cancels a consumed profile flight when the session is invalidated', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    return new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }));
  executeDocumentScript();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  const api = await import('./api');
  await api.restoreAccessToken();
  const { getCurrentUser } = await import('./auth-api');
  const result = getCurrentUser().catch(error => error);
  const { invalidateSession } = await import('./auth-session');
  invalidateSession();
  expect(await result).toMatchObject({ code: 'aborted' });
  expect(requests[1].signal.aborted).toBe(true);
  expect(requests).toHaveLength(2);
});

it('keeps the profile deadline through an unfinished response body independently of refresh', async () => {
  const api = await import('./api');
  let startedAt = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    if (request.url.endsWith('/auth/refresh')) return Response.json({ accessToken: 'document-token' });
    startedAt = Date.now();
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"id":"unfinished'));
      request.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
    } }), { headers: { 'Content-Type': 'application/json' } });
  }));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  executeDocumentScript();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  await api.restoreAccessToken();
  expect(api.getAccessToken()).toBe('document-token');
  const { getCurrentUser } = await import('./auth-api');
  const result = getCurrentUser().catch(error => error);
  await vi.advanceTimersByTimeAsync(14_999 - (Date.now() - startedAt));
  expect(requests[1].signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(2);
  expect(requests[1].signal.aborted).toBe(true);
  expect(await result).toMatchObject({ code: 'timeout', retryable: true });
  expect(requests).toHaveLength(2);
});

it.each([
  ['beginNewSession', false], ['beginNewSession', true], ['invalidateSession', false], ['invalidateSession', true],
] as const)('cancels the document refresh on %s, including an adopted flight (%s)', async (action, adopt) => {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    return new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }));
  executeDocumentScript();
  expect(requests).toHaveLength(1);
  const api = await import('./api');
  const restored = adopt ? api.restoreAccessToken().catch(error => error) : null;
  const session = await import('./auth-session');
  session[action]();
  expect(requests[0].signal.aborted).toBe(true);
  if (restored) expect(await restored).toMatchObject({ code: 'aborted' });
  expect(api.getAccessToken()).toBeNull();
});

it.each(['/dashboard', '/workout', '/workout/session-id', '/progress', '/cycle', '/profile'])(
  'restores from HTML on %s before client initialization, then adopts without another refresh', async path => {
  window.history.replaceState({}, '', path);
  executeDocumentScript();
  executeDocumentScript();
  expect(paths).toEqual(['/api/v1/auth/refresh']);
  expect(requests[0]).toMatchObject({ method: 'POST', credentials: 'include', cache: 'no-store' });
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'authenticated', usuario: { id: 'document-user' } });
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});

it.each([
  [503, 'SERVICE_UNAVAILABLE', 'Servidor no disponible.', 'error'],
  [401, 'UNAUTHORIZED', 'Sin sesión', 'anonymous'],
] as const)('preserves HTTP %s failure semantics without retrying rotation or fetching protected data', async (status, code, message, estado) => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    paths.push(new URL(request.url).pathname);
    return Response.json({ code, message, retryable: status === 503, requestId: 'synthetic-document-request' }, { status });
  }));
  executeDocumentScript();
  const { useAutenticacion } = await import('./auth-store');
  await useAutenticacion.getState().inicializar();
  expect(paths).toEqual(['/api/v1/auth/refresh']);
  expect(useAutenticacion.getState()).toMatchObject({ estado, usuario: null });
  const { getAccessToken } = await import('./api');
  expect(getAccessToken()).toBeNull();
});

it('keeps the original 15-second deadline through response body consumption', async () => {
  const api = await import('./api');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request);
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"accessToken":"unfinished'));
      request.signal.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true });
    } });
    return new Response(body, { headers: { 'Content-Type': 'application/json' } });
  }));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  executeDocumentScript();
  const restored = api.restoreAccessToken().catch(error => error);
  await vi.advanceTimersByTimeAsync(14_999);
  expect(requests[0].signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(2);
  expect(requests[0].signal.aborted).toBe(true);
  expect(await restored).toMatchObject({ code: 'timeout', retryable: true });
  expect(api.getAccessToken()).toBeNull();
});

it('cannot inject another HTML script through the configured API URL', async () => {
  const { buildDocumentRefreshScript } = await import('./document-refresh');
  const malicious = 'http://localhost:4000/api/v1/</script><script>window.injectedDocumentCode=true</script>';
  const document = new DOMParser().parseFromString(`<script>${buildDocumentRefreshScript(malicious)}</script>`, 'text/html');
  expect(document.querySelectorAll('script')).toHaveLength(1);
  window.eval(document.querySelector('script')!.textContent!);
  expect(Reflect.get(window, 'injectedDocumentCode')).toBeUndefined();
  expect(requests).toHaveLength(1);
});

it.each(['/', '/login', '/register', '/dashboard-other', '/workout-other'])(
  'does not rotate a cookie from server HTML on public or unrelated route %s', path => {
    window.history.replaceState({}, '', path);
    executeDocumentScript();
    expect(paths).toEqual([]);
  },
);
