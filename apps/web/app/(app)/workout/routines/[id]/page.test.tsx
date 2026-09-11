import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import EditarRutina from './page';

const account = {
  id: 'account-a', email: 'person@example.test', name: 'Persona',
  biologicalSex: 'PREFER_NOT_SAY' as const, birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01T00:00:00.000Z',
};
const routine = { id: 'r2', name: 'Rutina nueva', exercises: [] };

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/EditorRutina', () => ({
  EditorRutina: ({ titulo }: { titulo: string }) => <div>{titulo}</div>,
}));

function resolvedParams(id: string): Promise<{ id: string }> {
  const params = Promise.resolve({ id }) as Promise<{ id: string }> & {
    status?: string; value?: { id: string };
  };
  params.status = 'fulfilled';
  params.value = { id };
  return params;
}

function show(id: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
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
});
