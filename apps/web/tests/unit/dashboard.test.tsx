import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { components } from '@evry/api-client';
import Dashboard from '@/app/(app)/dashboard/page';
import { useAutenticacion } from '@/lib/auth-store';
import { setAccessToken } from '@/lib/api';

const user = {
  id: 'dashboard-a', email: 'alex@example.test', name: 'Alex', biologicalSex: 'MALE' as const,
  birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01',
};
const overview: components['schemas']['ProgressOverview'] = {
  period: { key: '30d', from: '2026-08-06', to: '2026-09-04', timezone: 'America/Bogota' },
  summary: { sessionsCompleted: 4, volumeKg: 1200, activeDays: 3, weeklyFrequency: 0.93 },
  comparison: {
    previous: { sessionsCompleted: 2, volumeKg: 500, activeDays: 2, weeklyFrequency: 0.47 },
    delta: { sessionsCompleted: 2, volumeKg: 700, activeDays: 1, weeklyFrequency: 0.46 },
  },
  records: [
    { exerciseId: 'squat', exerciseName: 'Sentadilla', kind: 'WEIGHT', value: 80, achievedAt: '2026-09-03T17:00:00Z' },
    { exerciseId: 'squat', exerciseName: 'Sentadilla', kind: 'REPS', value: 12, achievedAt: '2026-09-02T17:00:00Z' },
    { exerciseId: 'squat', exerciseName: 'Sentadilla', kind: 'ESTIMATED_1RM', value: 100, achievedAt: '2026-09-01T17:00:00Z' },
  ],
  muscleDistribution: [{ muscleGroup: 'QUADS', workingSets: 3, percentage: 100 }],
};
let answerOverview: (init?: RequestInit) => Promise<Response>;
let answerReadiness: (init?: RequestInit) => Promise<Response>;
const calls: URL[] = [];
let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-04T17:00:00Z'));
  calls.length = 0;
  answerOverview = async () => Response.json(overview);
  answerReadiness = async () => Response.json(null);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: user, estado: 'authenticated', cargando: false, error: null });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(url);
    if (url.pathname.endsWith('/progress/overview')) return answerOverview(init);
    if (url.pathname.endsWith('/workouts')) return Response.json([]);
    if (url.pathname.includes('/readiness/')) return answerReadiness(init);
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); client.clear(); setAccessToken(null); vi.unstubAllGlobals(); vi.useRealTimers(); });
function show() { return render(<QueryClientProvider client={client}><Dashboard /></QueryClientProvider>); }
function sessions() { return screen.getByRole('heading', { name: 'Sesiones 30D' }).closest('[role="group"]')!; }

it('renders canonical metrics, real period comparison and separately labelled record kinds', async () => {
  show();
  await waitFor(() => expect(screen.queryByText('Preparando tu resumen…')).not.toBeInTheDocument());
  expect(screen.getByText(/1\.200 kg en total/)).toBeInTheDocument();
  expect(sessions()).toHaveTextContent('4');
  expect(sessions()).toHaveTextContent('1.200 kg');
  expect(sessions()).toHaveTextContent('+2 frente al periodo anterior');
  expect(calls.find(url => url.pathname.endsWith('/progress/overview'))?.searchParams.get('period')).toBe('30d');
  const records = screen.getByRole('region', { name: 'Marcas recientes' });
  expect(within(records).getByText('Peso máximo')).toBeInTheDocument();
  expect(within(records).getByText('80 kg')).toBeInTheDocument();
  expect(within(records).getByText('12 repeticiones')).toBeInTheDocument();
  expect(within(records).getByText('1RM estimado')).toBeInTheDocument();
  expect(within(records).getByText('100 kg')).toBeInTheDocument();
});

it('does not report zero metrics or empty records while progress is loading', async () => {
  let resolve!: (response: Response) => void;
  answerOverview = () => new Promise(done => { resolve = done; });
  show();
  expect(screen.queryByRole('heading', { name: 'Sesiones 30D' })).not.toBeInTheDocument();
  expect(screen.queryByText('Termina algunas sesiones para ver tus mejores marcas.')).not.toBeInTheDocument();
  await act(async () => resolve(Response.json(overview)));
  await waitFor(() => expect(sessions()).toHaveTextContent('4'));
});

it('offers recovery without fabricated metrics after failure', async () => {
  answerOverview = async () => Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Sin conexión', retryable: true, requestId: 'test' }, { status: 503 });
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar');
  expect(screen.queryByRole('heading', { name: 'Sesiones 30D' })).not.toBeInTheDocument();
  expect(screen.queryByText('Termina algunas sesiones para ver tus mejores marcas.')).not.toBeInTheDocument();
  answerOverview = async () => Response.json(overview);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(sessions()).toHaveTextContent('4'));
});

it('shows a genuine empty period without inventing a comparison', async () => {
  answerOverview = async () => Response.json({ ...overview,
    summary: { sessionsCompleted: 0, volumeKg: 0, activeDays: 0, weeklyFrequency: 0 }, comparison: null, records: [], muscleDistribution: [],
  });
  show();
  expect(await screen.findByText(/Sin periodo anterior comparable\./)).toBeInTheDocument();
  expect(sessions()).toHaveTextContent('0');
  expect(screen.getByText('No hay sesiones completadas en este periodo.')).toBeInTheDocument();
});

it('cancels the old account request and never shows its late records in a new account', async () => {
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  answerOverview = init => { signal = init?.signal; return new Promise(done => { resolve = done; }); };
  show();
  await waitFor(() => expect(signal).toBeDefined());
  answerOverview = async () => Response.json({ ...overview, summary: { ...overview.summary, sessionsCompleted: 7 }, records: [] });
  act(() => useAutenticacion.setState({ usuario: { ...user, id: 'dashboard-b', name: 'Bea' } }));
  await waitFor(() => expect(signal?.aborted).toBe(true));
  await waitFor(() => expect(sessions()).toHaveTextContent('7'));
  await act(async () => resolve(Response.json(overview)));
  expect(sessions()).toHaveTextContent('7');
  expect(screen.queryByText('80 kg')).not.toBeInTheDocument();
});

it('updates the daily score immediately after a successful check-in without duplicate reads', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Registrar' }));
  answerReadiness = async () => Response.json({
    id: 'ready-1', userId: user.id, date: new Date().toISOString(), civilDate: null,
    sleepHrs: 7, stress: 3, soreness: 2, motivation: 4, score: 72,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.getByRole('group', { name: 'Estado del día' })).toHaveTextContent('72'));
  expect(screen.queryByRole('button', { name: 'Registrar' })).not.toBeInTheDocument();
  expect(calls.filter(url => url.pathname.endsWith('/readiness/latest'))).toHaveLength(1);
});

it('shows a failed check-in without losing the form and lets the user retry', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Registrar' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Estrés' }), { target: { value: '5' } });
  answerReadiness = async () => Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'No se pudo guardar', retryable: true, requestId: 'test' }, { status: 503 });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/guardar/i);
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  expect(screen.getByRole('slider', { name: 'Estrés' })).toHaveValue('5');
  expect(screen.getByRole('group', { name: 'Estado del día' })).toHaveTextContent('Sin registro de hoy');
  let saved: unknown;
  answerReadiness = async init => {
    saved = JSON.parse(String(init?.body));
    return Response.json({ id: 'ready-1', userId: user.id, date: '2026-09-04T17:00:00Z', civilDate: '2026-09-04T00:00:00.000Z',
      sleepHrs: 7, stress: 5, soreness: 2, motivation: 4, score: 55 });
  };
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.getByRole('group', { name: 'Estado del día' })).toHaveTextContent('55'));
  expect(saved).toEqual({ sleepHrs: 7, stress: 5, soreness: 2, motivation: 4 });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('retains a successful summary with a stale-data warning when background refresh fails', async () => {
  show();
  await waitFor(() => expect(sessions()).toHaveTextContent('4'));
  answerOverview = async () => Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Sin conexión', retryable: true, requestId: 'test' }, { status: 503 });
  await act(async () => { await client.invalidateQueries({ queryKey: ['progress'] }); });
  expect(screen.getByRole('alert')).toHaveTextContent('última consulta correcta');
  expect(sessions()).toHaveTextContent('1.200 kg');
});

it('does not hide successful progress when the independent readiness read fails', async () => {
  answerReadiness = async () => Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Sin conexión', retryable: true, requestId: 'test' }, { status: 503 });
  show();
  await waitFor(() => expect(sessions()).toHaveTextContent('1.200 kg'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar');
  expect(screen.queryByRole('group', { name: 'Estado del día' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Registrar' })).not.toBeInTheDocument();
});

it.each([
  ['2026-09-04T00:00:00.000Z', '2026-09-03T17:00:00Z', '72'],
  ['2026-09-03T00:00:00.000Z', '2026-09-04T17:00:00Z', 'Sin registro de hoy'],
])('uses the readiness civil date %s instead of the timestamp %s', async (civilDate, date, expected) => {
  answerReadiness = async () => Response.json({
    id: 'ready-1', userId: user.id, date, civilDate,
    sleepHrs: 7, stress: 3, soreness: 2, motivation: 4, score: 72,
  });
  show();
  await waitFor(() => expect(screen.getByRole('group', { name: 'Estado del día' })).toHaveTextContent(expected));
});
