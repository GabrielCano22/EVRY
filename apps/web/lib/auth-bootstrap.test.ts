import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from './api';
import { invalidateSession } from './auth-session';
import { useAutenticacion } from './auth-store';
import { restoreCurrentUser, type User } from './auth-api';

const user: User = { id: 'bootstrap-user', name: 'Eva', email: 'eva@example.test',
  biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01T00:00:00.000Z' };
const paths: string[] = [];
beforeEach(() => {
  invalidateSession();
  setAccessToken(null);
  paths.length = 0;
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'checking' });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    paths.push(path);
    if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'restored-token' });
    if (request.headers.get('authorization') === 'Bearer restored-token') return Response.json(user);
    return Response.json({ code: 'UNAUTHORIZED', message: 'No access token', retryable: false }, { status: 401 });
  }));
});
afterEach(() => { invalidateSession(); setAccessToken(null); vi.unstubAllGlobals(); });

it('restores cold authentication with only refresh then an authenticated user request', async () => {
  await useAutenticacion.getState().inicializar();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
  expect(getAccessToken()).toBe('restored-token');
});

it('does not rotate an existing in-memory token during initialization', async () => {
  setAccessToken('restored-token');
  await useAutenticacion.getState().inicializar();
  expect(paths).toEqual(['/api/v1/users/me']);
  expect(useAutenticacion.getState().estado).toBe('authenticated');
});

it('keeps refresh failures recoverable without querying user data', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    paths.push(new URL(input instanceof Request ? input.url : String(input)).pathname);
    return Response.json({ code: 'UNAVAILABLE', message: 'Servidor no disponible.', retryable: true }, { status: 503 });
  }));
  await useAutenticacion.getState().inicializar();
  expect(paths).toEqual(['/api/v1/auth/refresh']);
  expect(useAutenticacion.getState()).toMatchObject({ estado: 'error', usuario: null, error: 'Servidor no disponible.' });
});

it('shares one complete restoration across concurrent cold initializations', async () => {
  await Promise.all([useAutenticacion.getState().inicializar(), useAutenticacion.getState().inicializar()]);
  expect(paths.filter((path) => path.endsWith('/auth/refresh'))).toHaveLength(1);
  expect(paths.filter((path) => path.endsWith('/users/me'))).toHaveLength(1);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
});

it('permits a fresh restoration after a recoverable failure', async () => {
  let unavailable = true;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    paths.push(path);
    if (unavailable) return Response.json({ code: 'UNAVAILABLE', message: 'Servidor no disponible.', retryable: true }, { status: 503 });
    if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'restored-token' });
    if (request.headers.get('authorization') === 'Bearer restored-token') return Response.json(user);
    return Response.json({ code: 'UNAUTHORIZED', message: 'No access token', retryable: false }, { status: 401 });
  }));
  await Promise.all([useAutenticacion.getState().inicializar(), useAutenticacion.getState().inicializar()]);
  expect(paths).toEqual(['/api/v1/auth/refresh']);
  expect(useAutenticacion.getState().estado).toBe('error');
  unavailable = false;
  await useAutenticacion.getState().inicializar();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
});

it('does not start a refresh for a pre-aborted restoration', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(restoreCurrentUser(controller.signal)).rejects.toMatchObject({ code: 'aborted' });
  expect(paths).toEqual([]);
});

it('reuses a settled document bootstrap when the protected layout arrives later', async () => {
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
  // An explicit reload remains a fresh request, not a permanent user cache.
  await useAutenticacion.getState().recargarUsuario();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/users/me']);
});

it('does not reuse document bootstrap after session invalidation', async () => {
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  invalidateSession();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, estado: 'checking' });
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me', '/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(getAccessToken()).toBe('restored-token');
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
});

it('does not restore a late refresh after logout or query its old user', async () => {
  let resolveRefresh!: (response: Response) => void;
  const refresh = new Promise<Response>((resolve) => { resolveRefresh = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    paths.push(path);
    return path.endsWith('/auth/refresh') ? refresh : Response.json({ ok: true });
  }));
  const restoring = useAutenticacion.getState().inicializar();
  await vi.waitFor(() => expect(paths).toEqual(['/api/v1/auth/refresh']));
  await useAutenticacion.getState().cerrarSesion();
  resolveRefresh(Response.json({ accessToken: 'old-session-token' }));
  await restoring;
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/auth/logout']);
  expect(getAccessToken()).toBeNull();
  expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
});
