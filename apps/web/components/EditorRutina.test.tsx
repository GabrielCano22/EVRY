import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutenticacion } from '@/lib/auth-store';
import { trainingKeys, type ExerciseListItem, type Routine } from '@/lib/training-api';
import { EditorRutina } from './EditorRutina';

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

const selectedExercise: ExerciseListItem = {
  id: 'exercise-a',
  sourceId: null,
  name: 'barbell squat',
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
  imagePath: '/media/exercises/squat.jpg',
  gifPath: '/media/exercises/squat.gif',
  attribution: null,
  imageUrl: '/media/exercises/squat.jpg',
  gifUrl: '/media/exercises/squat.gif',
};

vi.mock('./ExercisePicker', () => ({
  ExercisePicker: ({ onPick }: { onPick: (exercise: ExerciseListItem) => void }) => (
    <button type="button" onClick={() => onPick(selectedExercise)}>Elegir sentadilla</button>
  ),
}));
vi.mock('./ExerciseMedia', () => ({ ExerciseMedia: () => <div>Miniatura</div> }));
vi.mock('./MapaMuscular', () => ({ MapaMuscular: () => <div>Mapa</div> }));

function show(props: Partial<React.ComponentProps<typeof EditorRutina>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onListo = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <EditorRutina
        titulo="Nueva rutina"
        onListo={onListo}
        onCancelar={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { client, invalidate, onListo };
}

async function addExerciseAndSave(name = 'Pierna fuerte') {
  fireEvent.change(screen.getByLabelText('Nombre de la rutina'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir sentadilla' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar rutina' }));
}

beforeEach(() => {
  useAutenticacion.setState({ usuario: account, estado: 'authenticated', cargando: false, error: null });
});

afterEach(() => {
  cleanup();
  useAutenticacion.setState({ usuario: null });
  vi.unstubAllGlobals();
});

describe('EditorRutina generated mutations', () => {
  it('creates a routine with the generated DTO and invalidates only the current account routines', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      return Promise.resolve(Response.json({ id: 'routine-a', name: 'Pierna fuerte', exercises: [] }));
    }));
    const { invalidate, onListo } = show();

    await addExerciseAndSave();

    await waitFor(() => expect(onListo).toHaveBeenCalledOnce());
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/api/v1/routines');
    expect(await requests[0].json()).toEqual({
      name: 'Pierna fuerte',
      notes: null,
      exercises: [{
        exerciseId: 'exercise-a',
        order: 0,
        targetSets: 3,
        targetReps: 10,
        notes: null,
        seriesPlan: [
          { reps: 10, weightKg: null },
          { reps: 10, weightKg: null },
          { reps: 10, weightKg: null },
        ],
      }],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trainingKeys.routines('account-a') });
  });

  it('shows server field errors and preserves the form so the user can retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      code: 'VALIDATION_ERROR',
      message: 'Revisa los datos enviados.',
      fieldErrors: { name: ['Ya existe una rutina con ese nombre.'] },
      retryable: false,
      requestId: 'request-a',
    }, { status: 422 })));
    const { onListo } = show();

    await addExerciseAndSave();

    expect(await screen.findByText('Ya existe una rutina con ese nombre.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nombre de la rutina/ })).toHaveValue('Pierna fuerte');
    expect(screen.getByRole('button', { name: /Eliminar/ })).toBeInTheDocument();
    expect(onListo).not.toHaveBeenCalled();
  });

  it('sends an explicit null day when removing the schedule from an existing routine', async () => {
    const routine: Routine = {
      id: 'routine-a',
      userId: 'account-a',
      name: 'Pierna',
      dayOfWeek: 2,
      notes: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      exercises: [{
        id: 'routine-exercise-a',
        routineId: 'routine-a',
        exerciseId: selectedExercise.id,
        order: 0,
        targetSets: 3,
        targetReps: 10,
        targetWeightKg: null,
        seriesPlan: [{ reps: 10, weightKg: null }],
        notes: null,
        exercise: {
          ...selectedExercise,
          instructions: null,
          instructionSteps: null,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      }],
    };
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
      requests.push(request);
      return Promise.resolve(Response.json(routine));
    }));
    const { onListo } = show({ titulo: 'Editar rutina', rutinaExistente: routine });

    fireEvent.click(screen.getByRole('button', { name: 'Sin día' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar rutina' }));

    await waitFor(() => expect(onListo).toHaveBeenCalledOnce());
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe('/api/v1/routines/routine-a');
    expect(await requests[0].json()).toMatchObject({ dayOfWeek: null });
  });
});
