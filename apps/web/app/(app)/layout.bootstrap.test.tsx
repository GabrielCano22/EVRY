import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LayoutApp from './layout';
import { useAutenticacion } from '@/lib/auth-store';
import { invalidateSession } from '@/lib/auth-session';
import { setAccessToken } from '@/lib/api';
import type { User } from '@/lib/auth-api';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/dashboard' }));

const user: User = {
  id: 'early-user', name: 'Eva', email: 'eva@example.test', biologicalSex: 'PREFER_NOT_SAY',
  birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const paths: string[] = [];
let unavailable = false;
beforeEach(() => {
  invalidateSession();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'checking' });
  paths.length = 0;
  unavailable = false;
  router.replace.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    paths.push(path);
    if (unavailable) return Response.json({ code: 'UNAVAILABLE', message: 'Servidor no disponible.', retryable: true }, { status: 503 });
    if (path.endsWith('/auth/refresh')) return Response.json({ accessToken: 'early-token' });
    if (request.headers.get('authorization') === 'Bearer early-token') return Response.json(user);
    return Response.json({ code: 'UNAUTHORIZED', message: 'Sin sesión', retryable: false }, { status: 401 });
  }));
});
afterEach(() => { cleanup(); invalidateSession(); setAccessToken(null); vi.unstubAllGlobals(); });

it('renders the real protected shell without repeating a settled early restoration', async () => {
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  render(<LayoutApp><h2>Contenido protegido</h2></LayoutApp>);
  expect(await screen.findByRole('heading', { name: 'Contenido protegido' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(router.replace).not.toHaveBeenCalled();
});

it('keeps early failure recoverable through the real retry button', async () => {
  unavailable = true;
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  render(<LayoutApp><h2>Contenido protegido</h2></LayoutApp>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar tu sesión');
  expect(paths).toEqual(['/api/v1/auth/refresh']);
  unavailable = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { name: 'Contenido protegido' })).toBeVisible();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/auth/refresh', '/api/v1/users/me']);
});

it('preserves anonymous server HTML and hydrates a settled client session without a mismatch', async () => {
  await useAutenticacion.getState().inicializar({ reuseForDocument: true });
  const content = <LayoutApp><h2>Contenido protegido</h2></LayoutApp>;
  const html = renderToString(content);
  expect(html).toContain('Cargando');
  expect(html).not.toContain('Contenido protegido');
  expect(html).not.toContain('Eva');
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const hydrationErrors: unknown[] = [];
  render(content, { container, hydrate: true, onRecoverableError: error => hydrationErrors.push(error) });
  expect(await screen.findByRole('heading', { name: 'Contenido protegido' })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
});

it('keeps known user content hidden while the document profile is still pending', async () => {
  let resolveProfile!: (response: Response) => void;
  const profile = new Promise<Response>(resolve => { resolveProfile = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    paths.push(path);
    return path.endsWith('/auth/refresh') ? Response.json({ accessToken: 'early-token' }) : profile;
  }));
  useAutenticacion.setState({ usuario: user, estado: 'authenticated' });
  const restoring = useAutenticacion.getState().inicializar({ reuseForDocument: true });
  await vi.waitFor(() => expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']));
  render(<LayoutApp><h2>Contenido protegido</h2></LayoutApp>);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(screen.queryByRole('heading', { name: 'Contenido protegido' })).not.toBeInTheDocument();
  await act(async () => { resolveProfile(Response.json(user)); await restoring; });
  expect(await screen.findByRole('heading', { name: 'Contenido protegido' })).toBeVisible();
  expect(paths).toEqual(['/api/v1/auth/refresh', '/api/v1/users/me']);
  expect(router.replace).not.toHaveBeenCalled();
});
