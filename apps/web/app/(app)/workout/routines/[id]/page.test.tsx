import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import { trainingKeys, type Routine } from '@/lib/training-api';
import EditarRutina from './page';

const account = {
  id: 'account-a', email: 'person@example.test', name: 'Persona',
  biologicalSex: 'PREFER_NOT_SAY' as const, birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01T00:00:00.000Z',
};
const routine = { id: 'r2', name: 'Rutina nueva', exercises: [] };

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/EditorRutina', async () => {
  const { useState } = await import('react');
  return {
    EditorRutina: ({ titulo, rutinaExistente }: { titulo: string; rutinaExistente: Routine }) => {
      const [name, setName] = useState(rutinaExistente.name);
      return (
        <div>
          <div>{titulo}</div>
          <label>Nombre de rutina<input aria-label="Nombre de rutina" value={name} onChange={(event) => setName(event.target.value)} /></label>
        </div>
      );
    },
  };
});

function resolvedParams(id: string): Promise<{ id: string }> {
  const params = Promise.resolve({ id }) as Promise<{ id: string }> & {
    status?: string; value?: { id: string };
  };
  params.status = 'fulfilled';
  params.value = { id };
  return params;
}

function show(id: string, seed?: typeof routine) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  if (seed) client.setQueryData(trainingKeys.routineDetail(account.id, id), seed);
  const view = render(
    <QueryClientProvider client={client}>
      <EditarRutina params={resolvedParams(id)} />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

beforeEach(() => {
  useAutenticacion.setState({ usuario: account, estado: 'authenticated', cargando: false, error: null });
});

afterEach(() => {
  cleanup();
  useAutenticacion.setState({ usuario: null });
  vi.unstubAllGlobals();
});

describe('EditarRutina generated query states', () => {
  it('retries from an honest error state and loads the generated routine response', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      return Promise.resolve(requests.length === 1
        ? Response.json({ code: 'SERVER_ERROR', message: 'Temporal' }, { status: 503 })
        : Response.json(routine));
    }));
    show('r1');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la rutina');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Editar: Rutina nueva')).toBeInTheDocument();
    expect(requests).toHaveLength(2);
    expect(new URL(requests[0].url).pathname).toBe('/api/v1/routines/r1');
  });

  it('aborts the obsolete routine read when the route id changes', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      if (new URL(request.url).pathname.endsWith('/new')) return Promise.resolve(Response.json(routine));
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    }));
    const view = show('old');
    await waitFor(() => expect(requests).toHaveLength(1));

    view.rerender(
      <QueryClientProvider client={view.client}>
        <EditarRutina params={resolvedParams('new')} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Editar: Rutina nueva')).toBeInTheDocument();
    expect(requests[0].signal.aborted).toBe(true);
  });

  it('keeps cached editor data mounted when a background refetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ code: 'SERVER_ERROR', message: 'Temporal' }, { status: 503 }),
    ));
    show('r2', routine);

    expect(screen.getByText('Editar: Rutina nueva')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos actualizar la rutina');
    expect(screen.getByText('Editar: Rutina nueva')).toBeInTheDocument();
  });

  it('remounts editor state when navigation changes to another cached routine', async () => {
    const first = { ...routine, id: 'old', name: 'Rutina anterior' };
    const second = { ...routine, id: 'new', name: 'Rutina siguiente' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      const id = new URL(request.url).pathname.endsWith('/new') ? 'new' : 'old';
      return Promise.resolve(Response.json(id === 'new' ? second : first));
    }));
    const view = show('old', first);
    const name = screen.getByRole('textbox', { name: 'Nombre de rutina' });
    fireEvent.change(name, { target: { value: 'Borrador local' } });

    view.client.setQueryData(trainingKeys.routineDetail(account.id, 'new'), second);
    view.rerender(
      <QueryClientProvider client={view.client}>
        <EditarRutina params={resolvedParams('new')} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('textbox', { name: 'Nombre de rutina' })).toHaveValue('Rutina siguiente');
  });
});
