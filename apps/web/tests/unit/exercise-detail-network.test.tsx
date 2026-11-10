import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { components } from '@evry/api-client';
import { ExerciseDetailButton, ExerciseDetailProvider } from '@/components/ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { DEFAULT_API_BASE_URL } from '@/lib/api-origin';
import { account, detail, progress } from '@/tests/fixtures/exercise-detail';

const exerciseUrl = `${DEFAULT_API_BASE_URL}/exercises/:id`;
const progressUrl = `${DEFAULT_API_BASE_URL}/progress/exercises/:id`;
const failure: components['schemas']['ApiError'] = {
  code: 'SERVICE_UNAVAILABLE', message: 'Servicio temporalmente no disponible.',
  retryable: true, requestId: 'msw-exercise-fixture',
};
const server = setupServer(
  http.get(exerciseUrl, ({ params }) => params.id === 'squat'
    ? HttpResponse.json(detail) : HttpResponse.json({ ...failure, code: 'NOT_FOUND', retryable: false }, { status: 404 })),
  http.get(progressUrl, ({ params, request }) => {
    const query = new URL(request.url).searchParams;
    if (params.id !== 'squat' || query.get('limit') !== '10' || !['30d', 'all'].includes(query.get('period') ?? '')) {
      return HttpResponse.json({ ...failure, code: 'VALIDATION_ERROR', retryable: false }, { status: 400 });
    }
    return HttpResponse.json(progress);
  }),
);
let client: QueryClient;
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
});
afterEach(() => {
  cleanup(); client.clear(); server.resetHandlers(); useAutenticacion.setState({ usuario: null });
});
afterAll(() => server.close());
function show() {
  render(<QueryClientProvider client={client}><ExerciseDetailProvider>
    <ExerciseDetailButton exerciseId="squat" tab="instructions">Ver ejercicio</ExerciseDetailButton>
  </ExerciseDetailProvider></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver ejercicio' }));
}

it('keeps a network failure distinct from absent instructions and recovers on explicit retry', async () => {
  server.use(http.get(exerciseUrl, () => HttpResponse.error()));
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el ejercicio');
  expect(screen.queryByText('Sin indicaciones disponibles.')).not.toBeInTheDocument();
  server.resetHandlers();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar ejercicio' }));
  expect(await screen.findByText('Desciende con control.')).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps metadata usable after progress fails instead of showing empty metrics', async () => {
  server.use(http.get(progressUrl, () => HttpResponse.json(failure, { status: 503 })));
  show(); await screen.findByText('Desciende con control.');
  fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso');
  expect(screen.queryByText(/0 sesiones/)).not.toBeInTheDocument();
  expect(screen.queryByText('Sin datos de carga para graficar.')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
  server.resetHandlers();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar progreso' }));
  expect(await screen.findByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Indicaciones' }));
  expect(screen.getByText('Desciende con control.')).toBeInTheDocument();
});

it('cancels a closed metadata read and cannot reopen the drawer with a late response', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let signal: AbortSignal | undefined;
  let nativeSignal: AbortSignal | undefined;
  const interceptedFetch = globalThis.fetch;
  const fetchObserver = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    nativeSignal = input instanceof Request ? input.signal : init?.signal ?? undefined;
    return interceptedFetch(input, init);
  });
  server.use(http.get(exerciseUrl, async ({ request }) => {
    signal = request.signal;
    await pending;
    return HttpResponse.json({ ...detail, name: 'Respuesta antigua' });
  }));
  try {
    show(); await waitFor(() => expect(signal).toBeDefined());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    // MSW 3 reconstructs an HTTP parser Request with a separate signal. Check
    // the application's native fetch boundary, while forwarding actual MSW fetch.
    await waitFor(() => expect(nativeSignal?.aborted).toBe(true));
    await act(async () => { release(); await pending; });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver ejercicio' })).toHaveFocus();
    server.resetHandlers(); fireEvent.click(screen.getByRole('button', { name: 'Ver ejercicio' }));
    expect(await screen.findByText('Desciende con control.')).toBeInTheDocument();
    expect(screen.queryByText('Respuesta antigua')).not.toBeInTheDocument();
  } finally { release(); fetchObserver.mockRestore(); }
});
