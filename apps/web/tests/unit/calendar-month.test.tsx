import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { useAutenticacion } from '@/lib/auth-store';
import { invalidateSession } from '@/lib/auth-session';
import type { Usuario } from '@/lib/types';

const accountA: Usuario = {
  id: 'account-a', email: 'a@example.test', name: 'Ada', biologicalSex: 'OTHER', birthDate: null,
  goals: [], trackCycle: true, avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01',
};

const emptyActivity = (from: string, to: string) => ({ from, to, days: [] });
const emptyCycle = (from: string, to: string, previousPeriodStart: string | null = null) => ({
  from, to, entries: [], previousPeriodStart,
});

type DeferredRequest = {
  url: URL;
  signal?: AbortSignal | null;
  resolve: (value: unknown, status?: number) => void;
};

const requests: URL[] = [];
const deferred: DeferredRequest[] = [];

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 0 } } });
  render(<QueryClientProvider client={client}><CalendarioActividad /></QueryClientProvider>);
  return client;
}

function respond(handler: (url: URL) => unknown | Response | Promise<unknown | Response>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    const value = await handler(url);
    return value instanceof Response ? value : Response.json(value);
  }));
}

function deferAll() {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    return new Promise<Response>((finish) => {
      deferred.push({
        url,
        signal: init?.signal,
        resolve: (value, status = 200) => finish(Response.json(value, { status })),
      });
    });
  }));
}

async function resolveDeferred(items: DeferredRequest[], value: (request: DeferredRequest) => unknown) {
  await act(async () => {
    items.forEach((item) => item.resolve(value(item)));
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-09-04T16:00:00.000Z'));
  requests.length = 0;
  deferred.length = 0;
  invalidateSession();
  useAutenticacion.setState({ usuario: accountA, estado: 'authenticated', cargando: false, error: null });
});

afterEach(async () => {
  cleanup();
  deferred.splice(0).forEach((item) => item.resolve({}));
  await Promise.resolve();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('monthly calendar reads', () => {
  it('requests the visible month, caps activity at today, and never downloads full workouts', async () => {
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-09-01', '2026-09-04')
      : emptyCycle('2026-09-01', '2026-09-30'));

    show();
    await screen.findByText('Aún no hay actividad registrada.');

    expect(requests.map((url) => `${url.pathname}?${url.searchParams}`)).toEqual(expect.arrayContaining([
      '/api/v1/progress/activity?from=2026-09-01&to=2026-09-04',
      '/api/v1/cycle/calendar?from=2026-09-01&to=2026-09-30',
    ]));
    expect(requests.some((url) => url.pathname.endsWith('/workouts'))).toBe(false);
  });

  it('uses server day labels and scalar session details without reconstructing local workout dates', async () => {
    respond((url) => url.pathname.endsWith('/progress/activity') ? {
      from: '2026-09-01', to: '2026-09-04', days: [{
        date: '2026-09-03', sessions: [{
          id: 'session-1', name: 'Fuerza nocturna', endedAt: '2026-09-04T04:30:00.000Z',
          setCount: 3, volumeKg: 412.6, cyclePhase: 'LUTEAL',
        }],
      }],
    } : emptyCycle('2026-09-01', '2026-09-30'));

    show();
    const day = await screen.findByRole('button', { name: /3 de septiembre de 2026, con sesión de entrenamiento/ });
    fireEvent.click(day);
    const details = screen.getByRole('region', { name: /Actividad del 3 de septiembre/ });
    expect(within(details).getByText('Fuerza nocturna')).toBeInTheDocument();
    expect(within(details).getByText('3s · 413kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ver actividad del 4 de septiembre de 2026$/ })).not.toHaveAccessibleName(/con sesión/);
  });

  it('crosses the year boundary and skips activity while still loading future cycle estimates', async () => {
    vi.setSystemTime(new Date('2026-12-15T16:00:00.000Z'));
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity(String(url.searchParams.get('from')), String(url.searchParams.get('to')))
      : emptyCycle(String(url.searchParams.get('from')), String(url.searchParams.get('to')), '2026-12-10'));
    show();
    await screen.findByText('Dic 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await screen.findByText('Ene 2027');
    await waitFor(() => expect(requests.some((url) => url.pathname.endsWith('/cycle/calendar') && url.search === '?from=2027-01-01&to=2027-01-31')).toBe(true));
    expect(requests.some((url) => url.pathname.endsWith('/progress/activity') && url.searchParams.get('from') === '2027-01-01')).toBe(false);
    expect(await screen.findByText('Fases estimadas')).toBeInTheDocument();
  });

  it('requests all 29 days when navigating into leap-year February', async () => {
    vi.setSystemTime(new Date('2024-01-15T16:00:00.000Z'));
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity(String(url.searchParams.get('from')), String(url.searchParams.get('to')))
      : emptyCycle(String(url.searchParams.get('from')), String(url.searchParams.get('to'))));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() => expect(requests.some((url) => url.pathname.endsWith('/cycle/calendar') && url.search === '?from=2024-02-01&to=2024-02-29')).toBe(true));
  });

  it('does not force a future activity read when retrying a failed cycle projection', async () => {
    vi.setSystemTime(new Date('2026-12-15T16:00:00.000Z'));
    respond((url) => {
      if (url.pathname.endsWith('/progress/activity')) return emptyActivity(String(url.searchParams.get('from')), String(url.searchParams.get('to')));
      if (url.searchParams.get('from') === '2027-01-01') {
        return Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Proyección temporalmente no disponible' }, { status: 503 });
      }
      return emptyCycle(String(url.searchParams.get('from')), String(url.searchParams.get('to')));
    });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Mes siguiente' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(requests.filter((url) => url.pathname.endsWith('/cycle/calendar') && url.searchParams.get('from') === '2027-01-01').length).toBeGreaterThan(1));
    expect(requests.some((url) => url.pathname.endsWith('/progress/activity') && url.searchParams.get('from') === '2027-01-01')).toBe(false);
  });

  it('advances the activity bound and today highlight at Bogota midnight without remounting', async () => {
    vi.setSystemTime(new Date('2026-09-04T04:58:00.000Z'));
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity(String(url.searchParams.get('from')), String(url.searchParams.get('to')))
      : emptyCycle(String(url.searchParams.get('from')), String(url.searchParams.get('to'))));
    show();

    await waitFor(() => expect(requests.some((url) => url.pathname.endsWith('/progress/activity') && url.search === '?from=2026-09-01&to=2026-09-03')).toBe(true));
    expect(screen.getByRole('button', { name: /^Ver actividad del 3 de septiembre de 2026$/ }).className).toContain('border-primary/50');
    expect(screen.getByRole('button', { name: /^Ver actividad del 4 de septiembre de 2026$/ }).className).not.toContain('border-primary/50');

    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60 * 1000 + 100); });

    await waitFor(() => expect(requests.some((url) => url.pathname.endsWith('/progress/activity') && url.search === '?from=2026-09-01&to=2026-09-04')).toBe(true));
    expect(screen.getByRole('button', { name: /^Ver actividad del 3 de septiembre de 2026$/ }).className).not.toContain('border-primary/50');
    expect(screen.getByRole('button', { name: /^Ver actividad del 4 de septiembre de 2026$/ }).className).toContain('border-primary/50');
  });

  it('announces a recorded non-start flow in the day accessible name', async () => {
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-09-01', '2026-09-04')
      : {
          from: '2026-09-01', to: '2026-09-30', previousPeriodStart: null, entries: [{
            id: 'flow-1', userId: accountA.id, date: '2026-09-02T00:00:00.000Z', flow: 'LIGHT',
            symptoms: [], energy: null, mood: null, notes: null, isPeriodStart: false,
          }],
        });
    show();

    expect(await screen.findByRole('button', {
      name: /^Ver actividad del 2 de septiembre de 2026, flujo: Ligero$/,
    })).toBeInTheDocument();
  });
});

describe('monthly calendar lifecycle and read states', () => {
  it('aborts the old month and never renders its late completion', async () => {
    deferAll();
    show();
    await waitFor(() => expect(deferred).toHaveLength(2));
    const september = [...deferred];
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(deferred).toHaveLength(4));
    expect(september.every((item) => item.signal?.aborted)).toBe(true);
    await resolveDeferred(september, (item) => item.url.pathname.endsWith('/progress/activity') ? {
      from: '2026-09-01', to: '2026-09-04', days: [{ date: '2026-09-03', sessions: [{
        id: 'private-a', name: 'Respuesta vieja', endedAt: '2026-09-03T12:00:00Z', setCount: 1, volumeKg: 10, cyclePhase: null,
      }] }],
    } : emptyCycle('2026-09-01', '2026-09-30'));
    expect(screen.getByRole('button', { name: /^Ver actividad del 3 de agosto de 2026$/ })).not.toHaveAccessibleName(/con sesión/);
    await resolveDeferred(deferred.slice(2), (item) => item.url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-08-01', '2026-08-31')
      : emptyCycle('2026-08-01', '2026-08-31'));
    expect(await screen.findByText('Ago 2026')).toBeInTheDocument();
  });

  it('clears selected private data and aborts reads on an account switch', async () => {
    respond((url) => url.pathname.endsWith('/progress/activity') ? {
      from: '2026-09-01', to: '2026-09-04', days: [{ date: '2026-09-02', sessions: [{
        id: 'a-only', name: 'Solo Ada', endedAt: '2026-09-02T12:00:00Z', setCount: 2, volumeKg: 20, cyclePhase: null,
      }] }],
    } : emptyCycle('2026-09-01', '2026-09-30'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /2 de septiembre.*con sesión/ }));
    expect(screen.getByText('Solo Ada')).toBeInTheDocument();

    deferAll();
    act(() => useAutenticacion.setState({ usuario: { ...accountA, id: 'account-b', name: 'Bea' } }));
    expect(screen.queryByText('Solo Ada')).not.toBeInTheDocument();
    await waitFor(() => expect(deferred).toHaveLength(2));
  });

  it('aborts pending reads from the previous account and ignores their late private response', async () => {
    deferAll();
    show();
    await waitFor(() => expect(deferred).toHaveLength(2));
    const accountARequests = [...deferred];

    act(() => useAutenticacion.setState({ usuario: { ...accountA, id: 'account-b', name: 'Bea' } }));
    await waitFor(() => expect(deferred).toHaveLength(4));
    expect(accountARequests.every((item) => item.signal?.aborted)).toBe(true);

    await resolveDeferred(accountARequests, (item) => item.url.pathname.endsWith('/progress/activity') ? {
      from: '2026-09-01', to: '2026-09-04', days: [{ date: '2026-09-02', sessions: [{
        id: 'private-a', name: 'Privado de Ada', endedAt: '2026-09-02T12:00:00Z', setCount: 1, volumeKg: 10, cyclePhase: null,
      }] }],
    } : emptyCycle('2026-09-01', '2026-09-30'));
    expect(screen.getByRole('button', { name: /^Ver actividad del 2 de septiembre de 2026$/ })).not.toHaveAccessibleName(/con sesión/);

    await resolveDeferred(deferred.slice(2), (item) => item.url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-09-01', '2026-09-04')
      : emptyCycle('2026-09-01', '2026-09-30'));
    expect(await screen.findByText('Aún no hay actividad registrada.')).toBeInTheDocument();
  });

  it('distinguishes loading, genuine empty, recoverable failure, stale data, and a partial cycle failure', async () => {
    let activityFails = false;
    let cycleFails = false;
    respond((url) => {
      if (url.pathname.endsWith('/progress/activity')) {
        if (activityFails) return Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Actividad temporalmente no disponible' }, { status: 503 });
        return emptyActivity('2026-09-01', '2026-09-04');
      }
      if (cycleFails) return Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Ciclo temporalmente no disponible' }, { status: 503 });
      return emptyCycle('2026-09-01', '2026-09-30');
    });
    const client = show();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando calendario');
    expect(await screen.findByText('Aún no hay actividad registrada.')).toBeInTheDocument();

    activityFails = true;
    await act(async () => { await client.invalidateQueries({ queryKey: ['calendar-activity', accountA.id] }); });
    expect(await screen.findByRole('alert')).toHaveTextContent(/datos anteriores.*Actividad temporalmente no disponible/i);

    activityFails = false;
    cycleFails = true;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['calendar-activity', accountA.id] });
      await client.invalidateQueries({ queryKey: ['calendar-cycle', accountA.id] });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Ciclo temporalmente no disponible');
    expect(screen.queryByText('Aún no hay actividad registrada.')).not.toBeInTheDocument();
  });

  it('uses a prior period seed, invalidates only this account on updates, and never reads cycle after opt-out', async () => {
    respond((url) => url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-09-01', '2026-09-04')
      : emptyCycle('2026-09-01', '2026-09-30', '2026-08-25'));
    const client = show();
    const septemberFirst = await screen.findByRole('button', { name: /^Ver actividad del 1 de septiembre de 2026$/ });
    expect(septemberFirst.className).toContain('bg-primary/30');
    expect(screen.getByText('Fases estimadas')).toBeInTheDocument();

    client.setQueryData(['calendar-cycle', 'account-b', 99, '2026-09-01', '2026-09-30', true], { private: true });
    const beforeUpdate = requests.filter((url) => url.pathname.endsWith('/cycle/calendar')).length;
    act(() => window.dispatchEvent(new CustomEvent('evry:cycle-updated')));
    await waitFor(() => expect(requests.filter((url) => url.pathname.endsWith('/cycle/calendar')).length).toBeGreaterThan(beforeUpdate));
    expect(client.getQueryData(['calendar-cycle', 'account-b', 99, '2026-09-01', '2026-09-30', true])).toEqual({ private: true });

    act(() => useAutenticacion.setState({ usuario: { ...accountA, trackCycle: false } }));
    const cycleCount = requests.filter((url) => url.pathname.endsWith('/cycle/calendar')).length;
    act(() => window.dispatchEvent(new CustomEvent('evry:cycle-updated')));
    await Promise.resolve();
    expect(requests.filter((url) => url.pathname.endsWith('/cycle/calendar'))).toHaveLength(cycleCount);
    expect(screen.queryByText('Fases estimadas')).not.toBeInTheDocument();
  });

  it('announces selection and only reports an empty selected day after successful reads', async () => {
    deferAll();
    show();
    const day = screen.getByRole('button', { name: /^Ver actividad del 1 de septiembre de 2026$/ });
    fireEvent.click(day);
    expect(day).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Sin actividad.')).not.toBeInTheDocument();
    await waitFor(() => expect(deferred).toHaveLength(2));
    await resolveDeferred([...deferred], (item) => item.url.pathname.endsWith('/progress/activity')
      ? emptyActivity('2026-09-01', '2026-09-04')
      : emptyCycle('2026-09-01', '2026-09-30'));
    expect(await screen.findByText('Sin actividad.')).toBeInTheDocument();
  });
});
