import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail, progress } from '@/tests/fixtures/exercise-detail';

vi.mock('./exercise-detail/ProgressPlot', () => { throw new Error('synthetic-plot-delivery-failure'); });

const progressWithChart: typeof progress = { ...progress, points: [{
  from: '2026-08-01T00:00:00.000Z', to: '2026-08-30T00:00:00.000Z',
  sessionsCount: 2, volumeKg: 100, maxWeightKg: 60, estimated1RMKg: 80,
}] };

it('retains progress metrics and other tabs when chart delivery fails', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return Promise.resolve(Response.json(new URL(request.url).pathname.includes('/progress/') ? progressWithChart : detail));
  });
  try {
    render(<QueryClientProvider client={client}><ExerciseDetailProvider>
      <ExerciseDetailButton exerciseId="squat" tab="progress">Ver Sentadilla</ExerciseDetailButton>
    </ExerciseDetailProvider></QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Ver Sentadilla' });
    trigger.focus(); fireEvent.click(trigger);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la gráfica');
    expect(screen.getByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
    expect(screen.queryByText('synthetic-plot-delivery-failure')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Reintentar contenido' });
    retry.focus(); fireEvent.click(retry);
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la gráfica');
    expect(screen.getByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Indicaciones' }));
    expect(screen.getByText('Desciende con control.')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  } finally {
    cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
  }
});
