import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ListaEntrenamientos from '../app/(app)/workout/page';
import { useAutenticacion } from '../lib/auth-store';
import { setAccessToken } from '../lib/api';
import { trainingKeys, type Workout } from '../lib/training-api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const user = {
  id: 'history-a', email: 'history@example.test', name: 'History', biologicalSex: 'OTHER' as const,
  birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
};
function workout(index: number, status: Workout['status'] = 'COMPLETED'): Workout {
  return {
    id: `workout-${index}`, userId: user.id, name: `Sesión ${index}`, status,
    startedAt: '2026-09-01T15:00:00.000Z', endedAt: status === 'COMPLETED' ? '2026-09-01T16:00:00.000Z' : null,
    cancelledAt: status === 'CANCELLED' ? '2026-09-01T16:00:00.000Z' : null,
    createdAt: '2026-09-01T15:00:00.000Z', updatedAt: '2026-09-01T16:00:00.000Z',
    clientId: null, lastSyncId: null, revision: 1, cyclePhase: null, notes: null,
    routineId: null, routine: null, sets: [],
  };
}
const firstPage = Array.from({ length: 20 }, (_, i) => workout(i));
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: user, estado: 'authenticated', error: null, cargando: false });
  setAccessToken('synthetic-history-access');
});
afterEach(() => { cleanup(); client.clear(); setAccessToken(null); vi.unstubAllGlobals(); });

function servePages(serve: (skip: number, request: Request) => Response | Promise<Response>) {
  const skips: number[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname.endsWith('/routines')) return Response.json([]);
    if (!url.pathname.endsWith('/workouts')) throw new Error(`Unexpected path ${url.pathname}`);
    const skip = Number(url.searchParams.get('skip') ?? 0);
    expect(url.searchParams.get('take')).toBe('20');
    skips.push(skip);
    return serve(skip, request);
  }));
  render(<QueryClientProvider client={client}><ListaEntrenamientos /></QueryClientProvider>);
  return skips;
}

it('loads older sessions on demand, deduplicates overlaps and stops after a short page', async () => {
  const skips = servePages(skip => Response.json(skip === 0 ? firstPage : [workout(19), workout(20)]));
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
  await screen.findByRole('heading', { name: 'Sesión 0' });
  expect(skips).toEqual([0]);
  expect(screen.queryByRole('heading', { name: 'Sesión 20' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más sesiones' }));
  await screen.findByRole('heading', { name: 'Sesión 20' });
  expect(screen.getAllByRole('heading', { name: 'Sesión 19' })).toHaveLength(1);
  expect(screen.getByRole('link', { name: /Sesión 20/ })).toHaveAttribute('href', '/workout/workout-20');
  expect(skips).toEqual([0, 20]);
  expect(screen.queryByRole('button', { name: 'Cargar más sesiones' })).not.toBeInTheDocument();
});

it('discards a pending older page when the account changes', async () => {
  let resolveOld!: (response: Response) => void;
  const oldPage = new Promise<Response>(resolve => { resolveOld = resolve; });
  const skips = servePages((skip, request) => request.headers.get('Authorization') === 'Bearer synthetic-history-b'
    ? Response.json([{ ...workout(40), userId: 'history-b', name: 'Sesión B' }])
    : skip === 0 ? Response.json(firstPage) : oldPage);
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
  await screen.findByRole('heading', { name: 'Sesión 0' });
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más sesiones' }));
  await waitFor(() => expect(skips).toEqual([0, 20]));
  act(() => {
    setAccessToken('synthetic-history-b');
    useAutenticacion.setState({ usuario: { ...user, id: 'history-b' } });
  });
  await screen.findByRole('heading', { name: 'Sesión B' });
  await act(async () => { resolveOld(Response.json([workout(20)])); await oldPage; });
  expect(screen.queryByRole('heading', { name: 'Sesión 0' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Sesión 20' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cargar más sesiones' })).not.toBeInTheDocument();
  expect(skips).toEqual([0, 20, 0]);
});

it('reports the server offset limit instead of requesting an invalid page or claiming all history is loaded', async () => {
  client.setDefaultOptions({ queries: { retry: false, gcTime: 0, staleTime: 30000 } });
  client.setQueryData(trainingKeys.workoutHistory(user.id), { pages: [firstPage], pageParams: [10000] });
  const skips = servePages(() => Response.json(firstPage));
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Puede haber sesiones más antiguas sin mostrar');
  expect(screen.queryByRole('button', { name: 'Cargar más sesiones' })).not.toBeInTheDocument();
  expect(skips).toEqual([]);
});

it('retains loaded sessions when the next page fails and retries that page only', async () => {
  let failures = 1;
  const skips = servePages(skip => skip === 0 ? Response.json(firstPage)
    : failures-- > 0 ? Response.json({ message: 'No disponible', code: 'unavailable', retryable: true }, { status: 503 })
      : Response.json([workout(20)]));
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
  await screen.findByRole('heading', { name: 'Sesión 0' });
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más sesiones' }));
  const retry = await screen.findByRole('button', { name: 'Reintentar página' });
  expect(screen.getByRole('heading', { name: 'Sesión 0' })).toBeVisible();
  fireEvent.click(retry);
  await screen.findByRole('heading', { name: 'Sesión 20' });
  await waitFor(() => expect(skips).toEqual([0, 20, 20]));
});

it('does not claim an empty total history when a full page has only cancelled sessions', async () => {
  servePages(skip => Response.json(skip === 0 ? firstPage.map(item => ({ ...item, status: 'CANCELLED', endedAt: null,
    cancelledAt: '2026-09-01T16:00:00.000Z' })) : [workout(20)]));
  fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
  const more = await screen.findByRole('button', { name: 'Cargar más sesiones' });
  expect(screen.queryByText('Sin historial aún.')).not.toBeInTheDocument();
  fireEvent.click(more);
  await screen.findByRole('heading', { name: 'Sesión 20' });
});
