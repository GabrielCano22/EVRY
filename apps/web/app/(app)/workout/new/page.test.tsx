import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import { trainingKeys } from '@/lib/training-api';
import NuevoEntrenamiento from './page';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function show(strict = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const page = <QueryClientProvider client={client}><NuevoEntrenamiento /></QueryClientProvider>;
  const view = render(strict ? <StrictMode>{page}</StrictMode> : page);
  return { ...view, client };
}

beforeEach(() => {
  replace.mockReset();
  useAutenticacion.setState({
    usuario: {
      id: 'account-a', email: 'person@example.test', name: 'Persona',
      biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
      avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01T00:00:00.000Z',
    },
    estado: 'authenticated', cargando: false, error: null,
  });
});
afterEach(() => {
  cleanup();
  useAutenticacion.setState({ usuario: null });
  vi.unstubAllGlobals();
});

describe('NuevoEntrenamiento automatic mutation', () => {
  it('creates exactly once under React Strict Mode and navigates only after success', async () => {
    const network = vi.fn().mockResolvedValue(Response.json({ id: 'workout-a' }));
    vi.stubGlobal('fetch', network);

    const view = show(true);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/workout/workout-a'));
    expect(network).toHaveBeenCalledOnce();
    expect(view.client.getQueryData(trainingKeys.workoutList('account-a'))).toEqual([
      expect.objectContaining({ id: 'workout-a' }),
    ]);
  });

  it('surfaces a conflict, then retries once and navigates after the successful response', async () => {
    const network = vi.fn()
      .mockResolvedValueOnce(Response.json({
        code: 'ACTIVE_WORKOUT_EXISTS', message: 'Ya existe una sesión activa.', retryable: false,
        requestId: 'request-conflict',
      }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ id: 'workout-b' }));
    vi.stubGlobal('fetch', network);
    show();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una sesión activa.');
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/workout/workout-b'));
    expect(network).toHaveBeenCalledTimes(2);
  });
});
