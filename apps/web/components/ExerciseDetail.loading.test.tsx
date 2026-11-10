import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail, progress } from '@/tests/fixtures/exercise-detail';

const evaluated = vi.hoisted(() => ({ map: false, activity: false }));
const translations = vi.hoisted(() => ({ loaded: false }));
vi.mock('@/lib/exercise-i18n', async () => {
  const actualExports = await vi.importActual('@/lib/exercise-i18n');
  translations.loaded = true;
  return actualExports;
});
// Observe the module-loading boundary without replacing visual components or
// their behavior. The actual exports execute and render in this test.
vi.mock('./MapaMuscular', async () => {
  const actualExports = await vi.importActual('./MapaMuscular');
  evaluated.map = true;
  return actualExports;
});
vi.mock('./exercise-detail/Activity', async () => {
  const actualExports = await vi.importActual('./exercise-detail/Activity');
  evaluated.activity = true;
  return actualExports;
});

it('does not evaluate unused drawer modules until their real content is requested', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return Response.json(new URL(request.url).pathname.includes('/progress/') ? progress : detail);
  });
  try {
    render(<QueryClientProvider client={client}><ExerciseDetailProvider>
      <ExerciseDetailButton exerciseId="squat">Ver Sentadilla</ExerciseDetailButton>
    </ExerciseDetailProvider></QueryClientProvider>);
    expect(evaluated).toEqual({ map: false, activity: false });
    expect(translations.loaded).toBe(false);
    const trigger = screen.getByRole('button', { name: 'Ver Sentadilla' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
    await screen.findByRole('button', { name: 'Espalda' });
    expect(translations.loaded).toBe(true);
    expect(evaluated).toEqual({ map: true, activity: false });
    expect(screen.getByText('Ejercicio de piernas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
    await screen.findByText('2 sesiones · 2 series de trabajo · 100 kg de volumen');
    expect(evaluated).toEqual({ map: true, activity: true });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  } finally {
    cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
  }
});
