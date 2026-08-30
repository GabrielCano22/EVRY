import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, vi, describe, expect, it } from 'vitest';
import { ExerciseChart } from './ExerciseChart';

const fixture = (sessionsCount: number) => ({
  exerciseId: 'exercise-1',
  period: { key: '30d', from: '2026-08-01', to: '2026-08-30', timezone: 'America/Bogota' },
  summary: { sessionsCount, workingSetsCount: 2, volumeKg: 0, bestWeight: null, repetitionRecord: null, estimated1RM: null },
  comparison: null, points: [],
  history: { items: [], page: 1, limit: 10, total: 0, hasMore: false, nextCursor: null },
});

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function TestProvider({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('ExerciseChart remote state', () => {
  it('shows loading, exposes an error, retries, then renders success', async () => {
    let reject!: (error: Error) => void;
    const fetcher = vi.fn()
      .mockReturnValueOnce(new Promise<Response>((_resolve, fail) => { reject = fail; }))
      .mockResolvedValueOnce(Response.json(fixture(2)));
    vi.stubGlobal('fetch', fetcher);
    render(<ExerciseChart exerciseId="e1" />, { wrapper: wrapper() });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando evolución');
    await act(async () => { reject(new Error('offline')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la evolución');
    expect(screen.queryByText('Sin datos de carga para graficar.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar evolución' }));
    expect(await screen.findByText(/2 sesiones · 2 series/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the newer success when an older request resolves later', async () => {
    let resolveOld!: (value: Response) => void;
    const fetcher = vi.fn()
      .mockReturnValueOnce(new Promise<Response>((done) => { resolveOld = done; }))
      .mockResolvedValueOnce(Response.json(fixture(3)));
    vi.stubGlobal('fetch', fetcher);
    const view = render(<ExerciseChart exerciseId="old" />, { wrapper: wrapper() });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    view.rerender(<ExerciseChart exerciseId="new" />);
    expect(await screen.findByText(/3 sesiones · 2 series/)).toBeInTheDocument();
    await act(async () => { resolveOld(Response.json(fixture(99))); });
    expect(screen.getByText(/3 sesiones · 2 series/)).toBeInTheDocument();
    expect(screen.queryByText(/99 sesiones/)).not.toBeInTheDocument();
  });
});
