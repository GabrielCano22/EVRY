import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import type { ExerciseListItem } from '@/lib/training-api';
import { ExercisePicker } from './ExercisePicker';

const account = {
  id: 'account-a',
  email: 'person@example.test',
  name: 'Persona',
  biologicalSex: 'PREFER_NOT_SAY' as const,
  birthDate: null,
  goals: [],
  trackCycle: false,
  avgCycleLen: 28,
  avgPeriodLen: 5,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function exercise(id: string, name: string): ExerciseListItem {
  return {
    id,
    sourceId: null,
    name,
    muscleGroup: 'QUADS',
    equipment: 'BARBELL',
    category: 'upper legs',
    bodyPart: 'upper legs',
    target: 'quads',
    secondaryMuscles: [],
    equipmentLabel: 'barbell',
    isCustom: false,
    ownerId: null,
    isCompound: true,
    tags: [],
    description: null,
    mediaId: null,
    imagePath: '/media/exercises/test.jpg',
    gifPath: '/media/exercises/test.gif',
    attribution: null,
    imageUrl: '/media/exercises/test.jpg',
    gifUrl: '/media/exercises/test.gif',
  };
}

function page(items: ExerciseListItem[], currentPage = 1, hasMore = false) {
  return Response.json({ items, page: currentPage, limit: 30, total: items.length, hasMore });
}

function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ExercisePicker onPick={vi.fn()} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAutenticacion.setState({ usuario: account, estado: 'authenticated', cargando: false, error: null });
});

afterEach(() => {
  cleanup();
  useAutenticacion.setState({ usuario: null });
  vi.unstubAllGlobals();
});

describe('ExercisePicker remote catalog states', () => {
  it('aborts the obsolete catalog read when the debounced search changes', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      const query = new URL(request.url).searchParams.get('q');
      if (query === 'press') return Promise.resolve(page([exercise('press', 'Press de pierna')]));
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    }));
    show();
    await waitFor(() => expect(requests).toHaveLength(1));

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, músculo o equipo…'), {
      target: { value: 'press' },
    });

    await screen.findByText('Empuje de pierna');
    expect(requests).toHaveLength(2);
    expect(requests[0].signal.aborted).toBe(true);
  });

  it('appends later pages without duplicating an exercise already rendered', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const requestedPage = Number(new URL(request.url).searchParams.get('page'));
      return Promise.resolve(requestedPage === 1
        ? page([exercise('a', 'Sentadilla'), exercise('b', 'Prensa')], 1, true)
        : page([exercise('b', 'Prensa'), exercise('c', 'Zancada')], 2, false));
    }));
    show();
    await screen.findByText('Sentadilla');
    expect(screen.getByAltText('Demostración de Sentadilla')).toHaveAttribute(
      'src',
      'http://localhost:4000/media/exercises/test.jpg',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cargar 30 más' }));

    await screen.findByText('Zancada');
    expect(screen.getAllByText('Prensa')).toHaveLength(1);
  });

  it('offers retry after an initial failure without presenting a false empty catalog', async () => {
    const network = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'SERVER_ERROR' }, { status: 503 }))
      .mockResolvedValueOnce(page([exercise('a', 'Sentadilla')]));
    vi.stubGlobal('fetch', network);
    show();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo.');
    expect(screen.queryByText('No encontramos ejercicios con esos filtros.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Sentadilla')).toBeInTheDocument();
  });

  it('keeps prior items and exposes a page-specific retry when loading more fails', async () => {
    const network = vi.fn()
      .mockResolvedValueOnce(page([exercise('a', 'Sentadilla')], 1, true))
      .mockResolvedValueOnce(Response.json({ code: 'SERVER_ERROR' }, { status: 503 }))
      .mockResolvedValueOnce(page([exercise('b', 'Prensa')], 2, false));
    vi.stubGlobal('fetch', network);
    show();
    await screen.findByText('Sentadilla');

    fireEvent.click(screen.getByRole('button', { name: 'Cargar 30 más' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más ejercicios.');
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar página' }));
    expect(await screen.findByText('Prensa')).toBeInTheDocument();
  });

  it('starts a fresh account-scoped catalog read when the authenticated account changes', async () => {
    const network = vi.fn().mockResolvedValue(page([exercise('a', 'Sentadilla')]));
    vi.stubGlobal('fetch', network);
    show();
    await screen.findByText('Sentadilla');

    act(() => useAutenticacion.setState({ usuario: { ...account, id: 'account-b' } }));

    await waitFor(() => expect(network).toHaveBeenCalledTimes(2));
  });
});
