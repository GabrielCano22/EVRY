import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExerciseDetailProgress } from './Activity';
import { useAutenticacion } from '@/lib/auth-store';
import { account, progress } from '@/tests/fixtures/exercise-detail';
import type { ExerciseProgress } from '@/lib/progress-api';

// Replace only unavailable chunk delivery, not chart/component output. A period
// without a representable 1RM must not depend on that download to show absence.
vi.mock('./ProgressPlot', () => { throw new Error('synthetic-unavailable-chart-chunk'); });

let client: QueryClient;
afterEach(async () => {
  cleanup(); client.clear();
  await vi.dynamicImportSettled();
  vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
});

it.each<{ name: string; points: ExerciseProgress['points'] }>([
  { name: 'an empty period', points: [] },
  { name: 'sessions with no estimated 1RM', points: [{ from: '2026-08-01', to: '2026-08-30',
    sessionsCount: 2, volumeKg: 100, maxWeightKg: null, estimated1RMKg: null }] },
])('shows metrics and explicit chart absence for $name despite unavailable chart delivery', async ({ points }) => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ ...progress, points })));
  render(<QueryClientProvider client={client}>
    <ExerciseDetailProgress accountId={account.id} exerciseId="squat" onContentRetry={() => undefined} />
  </QueryClientProvider>);
  expect(await screen.findByText('Sin datos de carga para graficar.')).toBeInTheDocument();
  await vi.dynamicImportSettled();
  expect(screen.getByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
  expect(screen.getByText('1RM estimado: Datos insuficientes')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Cargando gráfica…')).not.toBeInTheDocument();
});
