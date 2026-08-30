import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PaginaProgreso from '@/app/(app)/progress/page';

const overview = {
  period: { key: '30d', from: '2026-08-01', to: '2026-08-30', timezone: 'America/Bogota' },
  summary: { sessionsCompleted: 4, volumeKg: 1200, activeDays: 3, weeklyFrequency: 0.93 },
  comparison: {
    previous: { sessionsCompleted: 2, volumeKg: 500, activeDays: 2, weeklyFrequency: 0.47 },
    delta: { sessionsCompleted: 2, volumeKg: 700, activeDays: 1, weeklyFrequency: 0.46 },
  },
  records: [], muscleDistribution: [],
};
let fail = false;
const calls: URL[] = [];

beforeEach(() => {
  fail = false; calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(url);
    if (url.pathname.endsWith('/progress/overview')) {
      if (fail) return Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'No disponible', retryable: true, requestId: 'test' }, { status: 503 });
      return Response.json({ ...overview, comparison: url.searchParams.get('period') === 'all' ? null : overview.comparison });
    }
    if (url.pathname.endsWith('/exercises')) return Response.json({ items: [], nextCursor: null });
    if (url.pathname.endsWith('/progress/activity')) return Response.json({ from: '2026-08-01', to: '2026-08-30', days: [] });
    return Response.json([]);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function show() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={queryClient}><PaginaProgreso /></QueryClientProvider>);
}

it('renders canonical overview metrics and real comparison without legacy topExercises', async () => {
  show();
  const metric = await screen.findByRole('group', { name: 'Sesiones completadas' });
  expect(within(metric).getByText('4')).toBeInTheDocument();
  expect(within(metric).getByText(/\+2.*periodo anterior/)).toBeInTheDocument();
});

it('requests the selected period and does not invent an all-time comparison', async () => {
  show();
  await screen.findByRole('group', { name: 'Sesiones completadas' });
  fireEvent.change(screen.getByLabelText('Periodo de progreso'), { target: { value: 'all' } });
  await waitFor(() => expect(calls.some((url) => url.searchParams.get('period') === 'all')).toBe(true));
  expect(await screen.findByText('Sin periodo anterior comparable.')).toBeInTheDocument();
});

it('shows a retryable error instead of reporting zero sessions after a failed request', async () => {
  fail = true; show();
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu progreso');
  expect(screen.queryByRole('group', { name: 'Sesiones completadas' })).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar progreso' }));
  expect(await screen.findByRole('group', { name: 'Sesiones completadas' })).toHaveTextContent('4');
});
