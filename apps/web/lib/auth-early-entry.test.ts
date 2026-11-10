import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const entries = import.meta.glob('../instrumentation-client.ts');
const paths: string[] = [];
beforeEach(() => {
  vi.resetModules();
  paths.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    paths.push(path);
    if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'early-token' });
    if (request.headers.get('authorization') !== 'Bearer early-token') {
      return Response.json({ code: 'UNAUTHORIZED', message: 'Sin sesión', retryable: false }, { status: 401 });
    }
    return Response.json({ id: 'early-user', name: 'Eva', email: 'eva@example.test',
      biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
      avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01T00:00:00.000Z' });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

it.each(['/dashboard', '/workout', '/workout/session-id', '/progress', '/cycle', '/profile'])(
  'starts restoration on %s before a protected component mounts', async path => {
    window.history.replaceState({}, '', path);
    // Execute the actual entry when present; a missing entry must fail on
    // observable missing restoration, not a module-loader exception.
    await entries['../instrumentation-client.ts']?.();
    await vi.waitFor(() => expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']));
    const { useAutenticacion } = await import('./auth-store');
    await useAutenticacion.getState().inicializar({ reuseForDocument: true });
    expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
    expect(useAutenticacion.getState()).toMatchObject({ estado: 'authenticated', usuario: { id: 'early-user' } });
  },
);

it.each(['/', '/login', '/register', '/dashboard-other', '/workout-other'])(
  'does not restore a session on public or unrelated path %s', async path => {
    window.history.replaceState({}, '', path);
    await entries['../instrumentation-client.ts']?.();
    expect(paths).toEqual([]);
  },
);
