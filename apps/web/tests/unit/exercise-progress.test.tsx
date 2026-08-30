import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { components } from '@evry/api-client';
import { afterEach, expect, it, vi } from 'vitest';
import { ExerciseChart } from '@/components/ExerciseChart';

const progress: components['schemas']['ExerciseProgress'] = {
  exerciseId: 'exercise-1', period: { key: '30d', from: '2026-08-01', to: '2026-08-30', timezone: 'America/Bogota' },
  summary: { sessionsCount: 2, workingSetsCount: 2, volumeKg: 0, bestWeight: null, repetitionRecord: null, estimated1RM: null },
  comparison: null, points: [],
  history: {
    items: [{ workoutId: 'workout-1', workoutName: 'Sesión primera', startedAt: '2026-08-30T12:00:00.000Z', endedAt: '2026-08-30T13:00:00.000Z', sets: [] }],
    page: 1, limit: 10, total: 2, hasMore: true, nextCursor: 'next-token',
  },
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('reads canonical history and follows nextCursor without replacing the first page', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const urls: URL[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    urls.push(url);
    return Response.json(url.searchParams.has('cursor') ? {
      ...progress,
      history: { ...progress.history, page: null, hasMore: false, nextCursor: null,
        items: [{ ...progress.history.items[0], workoutId: 'workout-2', workoutName: 'Sesión segunda' }] },
    } : progress);
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><ExerciseChart exerciseId="exercise-1" period="30d" /></QueryClientProvider>);
  expect(await screen.findByText('Sesión primera')).toBeInTheDocument();
  expect(screen.getByText('Sin datos de carga para graficar.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cargar más sesiones' }));
  expect(await screen.findByText('Sesión segunda')).toBeInTheDocument();
  expect(screen.getByText('Sesión primera')).toBeInTheDocument();
  await waitFor(() => expect(urls.at(-1)?.searchParams.get('cursor')).toBe('next-token'));
  expect(urls[0].pathname).toContain('/progress/exercises/exercise-1');
  expect(screen.queryByRole('button', { name: 'Cargar más sesiones' })).not.toBeInTheDocument();
});
