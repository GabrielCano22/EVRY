import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import { trainingKeys } from '@/lib/training-api';
import ListaEntrenamientos from './page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const account = {
  id: 'account-a', email: 'person@example.test', name: 'Persona',
  biologicalSex: 'PREFER_NOT_SAY' as const, birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01T00:00:00.000Z',
};

function workout(id: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
  return {
    id, userId: account.id, name: `Sesión ${id}`,
    startedAt: '2026-09-10T12:00:00.000Z',
    endedAt: status === 'COMPLETED' ? '2026-09-10T13:00:00.000Z' : null,
    cancelledAt: status === 'CANCELLED' ? '2026-09-10T12:30:00.000Z' : null,
    status, clientId: null, lastSyncId: null, revision: 1, cyclePhase: null, notes: null,
    routineId: null, civilDate: null, createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z', sets: [], routine: null,
  };
}

function routine(id = 'routine-a') {
  return {
    id, userId: account.id, name: 'Pierna', dayOfWeek: null, notes: null,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    exercises: [],
  };
}

function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}><ListaEntrenamientos /></QueryClientProvider>,
  );
  return { ...view, client };
}

beforeEach(() => {
  push.mockReset();
  useAutenticacion.setState({ usuario: account, estado: 'authenticated', cargando: false, error: null });
});

afterEach(() => {
  cleanup();
  useAutenticacion.setState({ usuario: null });
  vi.unstubAllGlobals();
});

describe('ListaEntrenamientos remote sections', () => {
  it('keeps successful workouts visible and retries only the failed routine section', async () => {
    const paths: string[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (path.endsWith('/workouts')) return Promise.resolve(Response.json([workout('active', 'ACTIVE')]));
      return Promise.resolve(paths.filter((item) => item.endsWith('/routines')).length === 1
        ? Response.json({ code: 'SERVER_ERROR', message: 'Temporal' }, { status: 503 })
        : Response.json([routine()]));
    }));
    show();

    expect(await screen.findByText('Sesión active')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las rutinas');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar rutinas' }));

    expect(await screen.findByText('Pierna')).toBeInTheDocument();
    expect(paths.filter((path) => path.endsWith('/workouts'))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith('/routines'))).toHaveLength(2);
  });

  it('uses canonical status so cancelled sessions are not shown as active and completed sessions remain history', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      return Promise.resolve(new URL(request.url).pathname.endsWith('/workouts')
        ? Response.json([workout('cancelled', 'CANCELLED'), workout('done', 'COMPLETED')])
        : Response.json([]));
    }));
    show();
    await waitFor(() => expect(screen.queryByText('Cargando entrenamientos…')).not.toBeInTheDocument());

    expect(screen.queryByText('Sesión activa')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Historial/ }));
    expect(screen.getByText('Sesión done')).toBeInTheDocument();
    expect(screen.queryByText('Sesión cancelled')).not.toBeInTheDocument();
  });

  it('does not present an empty history when the workout read failed', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      return Promise.resolve(new URL(request.url).pathname.endsWith('/workouts')
        ? Response.json({ code: 'SERVER_ERROR', message: 'Temporal' }, { status: 503 })
        : Response.json([routine()]));
    }));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los entrenamientos');

    fireEvent.click(screen.getByRole('button', { name: /Historial/ }));

    expect(screen.queryByText('Sin historial aún.')).not.toBeInTheDocument();
  });

  it('preserves a routine card and reports a failed deletion', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (request.method === 'DELETE') {
        return Promise.resolve(Response.json({ code: 'SERVER_ERROR', message: 'No se pudo eliminar.' }, { status: 503 }));
      }
      return Promise.resolve(path.endsWith('/workouts') ? Response.json([]) : Response.json([routine()]));
    }));
    show();
    await screen.findByText('Pierna');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar rutina Pierna' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar');
    expect(screen.getByText('Pierna')).toBeInTheDocument();
  });

  it('submits a quick start only once while the request is pending', async () => {
    let postCalls = 0;
    let resolvePost!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      if (request.method === 'POST') {
        postCalls += 1;
        return new Promise<Response>((resolve) => { resolvePost = resolve; });
      }
      return Promise.resolve(Response.json([]));
    }));
    const view = show();
    fireEvent.click(await screen.findByRole('button', { name: /Sesión rápida/ }));
    const start = screen.getByRole('button', { name: 'Iniciar' });

    fireEvent.click(start);
    await waitFor(() => expect(postCalls).toBe(1));
    fireEvent.click(start);
    expect(postCalls).toBe(1);
    resolvePost(Response.json(workout('quick', 'ACTIVE')));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/workout/quick'));
    expect(view.client.getQueryData(trainingKeys.workoutList(account.id))).toEqual([
      expect.objectContaining({ id: 'quick', status: 'ACTIVE' }),
    ]);
  });

  it('submits a routine start only once while the request is pending', async () => {
    let postCalls = 0;
    let resolvePost!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (request.method === 'POST') {
        postCalls += 1;
        return new Promise<Response>((resolve) => { resolvePost = resolve; });
      }
      return Promise.resolve(path.endsWith('/workouts') ? Response.json([]) : Response.json([routine()]));
    }));
    show();
    const start = await screen.findByRole('button', { name: 'Empezar rutina' });

    fireEvent.click(start);
    await waitFor(() => expect(postCalls).toBe(1));
    fireEvent.click(start);
    expect(postCalls).toBe(1);
    resolvePost(Response.json(workout('routine-workout', 'ACTIVE')));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/workout/routine-workout'));
  });

  it('surfaces a structured active-session conflict and does not navigate', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (request.method === 'POST') {
        return Promise.resolve(Response.json({
          code: 'ACTIVE_WORKOUT_EXISTS', message: 'Ya existe una sesión activa.', retryable: false,
          requestId: 'request-conflict',
        }, { status: 409 }));
      }
      return Promise.resolve(path.endsWith('/workouts') ? Response.json([]) : Response.json([]));
    }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Sesión rápida/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una sesión activa.');
    expect(push).not.toHaveBeenCalled();
  });
});
