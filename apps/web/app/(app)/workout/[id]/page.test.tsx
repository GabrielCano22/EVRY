import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import { trainingKeys } from '@/lib/training-api';
import DetalleEntrenamiento from './page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/ExerciseMedia', () => ({ ExerciseMedia: () => <div>Medio</div> }));
vi.mock('@/components/RestTimer', () => ({ RestTimer: () => <div>Descanso</div> }));

const account = {
  id: 'account-a', email: 'person@example.test', name: 'Persona',
  biologicalSex: 'PREFER_NOT_SAY' as const, birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01T00:00:00.000Z',
};
const exercise = {
  id: 'exercise-a', sourceId: null, name: 'barbell squat', muscleGroup: 'QUADS',
  equipment: 'BARBELL', category: 'upper legs', bodyPart: 'upper legs', target: 'quads',
  secondaryMuscles: [], equipmentLabel: 'barbell', isCustom: false, ownerId: null,
  isCompound: true, tags: [], description: null, mediaId: null, imagePath: null, gifPath: null,
  attribution: null, instructions: null, instructionSteps: null,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function workout(id: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED', withSet = false) {
  const set = {
    id: 'set-a', workoutId: id, exerciseId: exercise.id, order: 1, weightKg: 20, reps: 8,
    durationS: null, rpe: 7, isWarmup: false, completedAt: '2026-09-10T12:10:00.000Z',
    clientMutationId: null, clientId: null, revision: 1, techniqueStable: null,
    updatedAt: '2026-09-10T12:10:00.000Z', exercise,
  };
  return {
    id, userId: account.id, name: `Sesión ${id}`, startedAt: '2026-09-10T12:00:00.000Z',
    endedAt: status === 'COMPLETED' ? '2026-09-10T13:00:00.000Z' : null,
    cancelledAt: status === 'CANCELLED' ? '2026-09-10T12:30:00.000Z' : null,
    status, clientId: null, lastSyncId: null, revision: 1, cyclePhase: null, notes: null,
    routineId: 'routine-a', civilDate: null, createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z', sets: withSet ? [set] : [],
    routine: {
      id: 'routine-a', userId: account.id, name: 'Pierna', dayOfWeek: null, notes: null,
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
      exercises: [{
        id: 'routine-exercise-a', routineId: 'routine-a', exerciseId: exercise.id, order: 0,
        targetSets: 3, targetReps: 8, targetWeightKg: 20,
        seriesPlan: [{ reps: 8, weightKg: 20 }], notes: null, exercise,
      }],
    },
  };
}

function resolvedParams(id: string): Promise<{ id: string }> {
  const params = Promise.resolve({ id }) as Promise<{ id: string }> & {
    status?: string; value?: { id: string };
  };
  params.status = 'fulfilled'; params.value = { id };
  return params;
}

function show(id = 'w1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <DetalleEntrenamiento params={resolvedParams(id)} />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

beforeEach(() => {
  push.mockReset();
  useAutenticacion.setState({ usuario: account, estado: 'authenticated', cargando: false, error: null });
});
afterEach(() => {
  cleanup(); useAutenticacion.setState({ usuario: null }); vi.unstubAllGlobals();
});

describe('DetalleEntrenamiento generated remote state', () => {
  it('aborts the obsolete workout read when id changes', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      if (new URL(request.url).pathname.endsWith('/new')) return Promise.resolve(Response.json(workout('new', 'ACTIVE')));
      return new Promise<Response>((_resolve, reject) => request.signal.addEventListener(
        'abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true },
      ));
    }));
    const view = show('old');
    await waitFor(() => expect(requests).toHaveLength(1));

    view.rerender(<QueryClientProvider client={view.client}><DetalleEntrenamiento params={resolvedParams('new')} /></QueryClientProvider>);

    expect(await screen.findByText('Sesión new')).toBeInTheDocument();
    expect(requests[0].signal.aborted).toBe(true);
  }, 10_000);

  it('never exposes mutation controls for a cancelled workout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(workout('cancelled', 'CANCELLED'))));
    show('cancelled');
    await screen.findByText('Sesión cancelled');

    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empezar|Añadir serie|Agregar ejercicio/ })).not.toBeInTheDocument();
  });

  it('never exposes mutation controls for a completed workout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(workout('done', 'COMPLETED'))));
    show('done');
    await screen.findByText('Sesión done');

    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empezar|Añadir serie|Agregar ejercicio/ })).not.toBeInTheDocument();
  });

  it('keeps canonical data and offers retry when adding a set fails', async () => {
    const requests: Request[] = [];
    let setAttempts = 0;
    let workoutReads = 0;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      const path = new URL(request.url).pathname;
      if (path.endsWith('/exercises/exercise-a')) return Promise.resolve(Response.json({ ...exercise, imageUrl: null, gifUrl: null }));
      if (path.endsWith('/adaptive/recommend/exercise-a')) return Promise.resolve(Response.json({
        exerciseId: exercise.id, targetWeightKg: 20, targetReps: 8,
        rationale: ['Mantén la técnica.'], confidence: 0.7, action: 'HOLD',
      }));
      if (path.endsWith('/sets')) {
        setAttempts += 1;
        return Promise.resolve(setAttempts === 1
          ? Response.json({ code: 'SERVER_ERROR', message: 'No se pudo registrar la serie.' }, { status: 503 })
          : Response.json(workout('w1', 'ACTIVE', true).sets[0]));
      }
      workoutReads += 1;
      return Promise.resolve(workoutReads === 1
        ? Response.json(workout('w1', 'ACTIVE'))
        : Response.json({ code: 'SERVER_ERROR', message: 'No se pudo refrescar.' }, { status: 503 }));
    }));
    show();
    await screen.findByText('Sesión w1');
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    await screen.findByText('Registrando');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar serie' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar la serie.');
    expect(screen.getByText('Sesión w1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar serie' }));

    await waitFor(() => expect(setAttempts).toBe(2));
    const setRequests = requests.filter((request) => new URL(request.url).pathname.endsWith('/sets'));
    const firstBody = await setRequests[0].json();
    const secondBody = await setRequests[1].json();
    expect(firstBody).toMatchObject({ exerciseId: exercise.id, order: 1, weightKg: 20, reps: 8, rpe: 7 });
    expect(firstBody.clientMutationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondBody.clientMutationId).toBe(firstBody.clientMutationId);
    expect(await screen.findByText(/1 series totales/)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('última versión guardada');
    expect(screen.getByRole('button', { name: 'Reintentar actualización' })).toBeInTheDocument();
  });

  it('submits a set only once while the request is pending', async () => {
    let setCalls = 0;
    let resolveSet!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (path.endsWith('/exercises/exercise-a')) return Promise.resolve(Response.json({ ...exercise, imageUrl: null, gifUrl: null }));
      if (path.endsWith('/adaptive/recommend/exercise-a')) return Promise.resolve(Response.json({
        exerciseId: exercise.id, targetWeightKg: 20, targetReps: 8,
        rationale: ['Mantén la técnica.'], confidence: 0.7, action: 'HOLD',
      }));
      if (path.endsWith('/sets')) {
        setCalls += 1;
        return new Promise<Response>((resolve) => { resolveSet = resolve; });
      }
      return Promise.resolve(Response.json(workout('w1', 'ACTIVE')));
    }));
    show();
    await screen.findByText('Sesión w1');
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));
    await screen.findByText('Registrando');
    const submit = screen.getByRole('button', { name: 'Registrar serie' });

    fireEvent.click(submit);
    await waitFor(() => expect(setCalls).toBe(1));
    fireEvent.click(submit);
    expect(setCalls).toBe(1);
    resolveSet(Response.json(workout('w1', 'ACTIVE', true).sets[0]));
  });

  it('keeps exercise detail usable when its recommendation fails independently', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      const path = new URL(request.url).pathname;
      if (path.endsWith('/exercises/exercise-a')) return Promise.resolve(Response.json({ ...exercise, imageUrl: null, gifUrl: null }));
      if (path.endsWith('/adaptive/recommend/exercise-a')) {
        return Promise.resolve(Response.json({ code: 'SERVER_ERROR', message: 'Temporal' }, { status: 503 }));
      }
      return Promise.resolve(Response.json(workout('w1', 'ACTIVE')));
    }));
    show();
    await screen.findByText('Sesión w1');

    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(await screen.findByText('Registrando')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la sugerencia');
    expect(screen.getByRole('button', { name: 'Registrar serie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reintentar sugerencia' })).toBeInTheDocument();
  });

  it('navigates only after a successful finish retry', async () => {
    let finishAttempts = 0;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      if (request.method === 'POST') {
        finishAttempts += 1;
        return Promise.resolve(finishAttempts === 1
          ? Response.json({ code: 'SERVER_ERROR', message: 'No se pudo finalizar.' }, { status: 503 })
          : Response.json(workout('w1', 'COMPLETED')));
      }
      return Promise.resolve(Response.json(workout('w1', 'ACTIVE')));
    }));
    show();
    await screen.findByText('Sesión w1');

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo finalizar.');
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar finalizar' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(finishAttempts).toBe(2);
  });

  it('submits finish only once while pending and hides a stale retry in terminal state', async () => {
    let finishCalls = 0;
    let resolveFinish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      if (request.method === 'POST') {
        finishCalls += 1;
        return new Promise<Response>((resolve) => { resolveFinish = resolve; });
      }
      return Promise.resolve(Response.json(workout('w1', 'ACTIVE')));
    }));
    const view = show();
    await screen.findByText('Sesión w1');
    const finish = screen.getByRole('button', { name: 'Finalizar' });

    fireEvent.click(finish);
    await waitFor(() => expect(finishCalls).toBe(1));
    fireEvent.click(finish);
    expect(finishCalls).toBe(1);
    resolveFinish(Response.json({ code: 'SERVER_ERROR', message: 'No se pudo finalizar.' }, { status: 503 }));
    expect(await screen.findByRole('button', { name: 'Reintentar finalizar' })).toBeInTheDocument();

    view.client.setQueryData(trainingKeys.workoutDetail(account.id, 'w1'), workout('w1', 'COMPLETED'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reintentar finalizar' })).not.toBeInTheDocument());
  });
});
