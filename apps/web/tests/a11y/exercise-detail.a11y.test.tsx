import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from '@/components/ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail, progress } from '@/tests/fixtures/exercise-detail';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null }); });
it('has an accessible named dialog and connected tabs in every view', async () => {
  useAutenticacion.setState({ usuario: account });
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => Response.json(String(input instanceof Request ? input.url : input).includes('/progress/') ? progress : detail));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><ExerciseDetailProvider><ExerciseDetailButton exerciseId="squat">Abrir</ExerciseDetailButton></ExerciseDetailProvider></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  const dialog = await screen.findByRole('dialog', { name: 'Sentadilla' });
  for (const name of ['Resumen', 'Indicaciones', 'Historial', 'Progreso']) {
    fireEvent.click(screen.getByRole('tab', { name }));
    expect((await axe(dialog, { rules: { 'color-contrast': { enabled: false } } })).violations).toHaveLength(0);
  }
  client.clear();
});
