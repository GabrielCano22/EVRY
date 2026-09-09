import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { RoutineManager } from './RoutineManager';
import { createRoutine, deleteRoutine, updateRoutine, type Routine } from './routines';
import type { Exercise } from '../catalog/catalog';

jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('./routines', () => ({ createRoutine: jest.fn(), updateRoutine: jest.fn(), deleteRoutine: jest.fn() }));

const session = { userId: 'user-1', serverUrl: 'https://api.example.com/api/v1', version: 1 };
const exercise = (id: string, name: string): Exercise => ({
  id, sourceId: null, name, muscleGroup: 'QUADS', equipment: 'BARBELL', category: null, imagePath: null, gifPath: null,
  target: null, bodyPart: null, secondaryMuscles: [], equipmentLabel: null, isCustom: false, ownerId: null,
  isCompound: true, tags: [], description: null, mediaId: null, attribution: null, imageUrl: null, gifUrl: null,
});
const exercises = [exercise('exercise-1', 'Sentadilla'), exercise('exercise-2', 'Peso muerto')];
const routine: Routine = {
  id: 'routine-1', userId: 'user-1', name: 'Piernas', dayOfWeek: 2, notes: 'Fuerza',
  createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-09T10:00:00.000Z',
  exercises: [{
    id: 'routine-exercise-1', routineId: 'routine-1', exerciseId: 'exercise-1', order: 0, targetSets: 3,
    targetReps: 8, targetWeightKg: 60, seriesPlan: null, notes: 'Control',
    exercise: { ...exercises[0], instructions: null, instructionSteps: null, createdAt: '2026-09-09T10:00:00.000Z' },
  }],
};

let queryClient: QueryClient;
type CatalogState = { catalogLoading?: boolean; catalogError?: Error | null; catalogNotice?: string | null; catalogSource?: 'server' | 'cache' | null; catalogSuccess?: boolean };
type ManagerOptions = { routines?: Routine[]; routinesStale?: boolean; exercises?: Exercise[]; onSearchChange?: (value: string) => void } & CatalogState;
const manager = (options: ManagerOptions = {}) => {
  const { routines = [routine], routinesStale = false, exercises: catalogExercises = exercises, catalogLoading = false, catalogError = null, catalogNotice = null, catalogSource = 'server', catalogSuccess = true, onSearchChange = jest.fn() } = options;
  return <RoutineManager
    session={session} routines={routines} routinesStale={routinesStale} exercises={catalogExercises} onStartRoutine={jest.fn()}
    catalogSearch="" catalogPage={1} catalogHasMore={true} catalogLoading={catalogLoading} onSearchChange={onSearchChange} onChangePage={jest.fn()}
    catalogError={catalogError} catalogNotice={catalogNotice} catalogSource={catalogSource} catalogSuccess={catalogSuccess} onRetryCatalog={jest.fn()}
  />;
};
const show = async (options: ManagerOptions = {}) => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['routines'], options.routines ?? [routine]);
  const onSearchChange = jest.fn();
  const view = await render(<QueryClientProvider client={queryClient}>{manager({ ...options, onSearchChange })}</QueryClientProvider>);
  return { ...view, onSearchChange };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createRoutine).mockResolvedValue(routine);
  jest.mocked(updateRoutine).mockResolvedValue(routine);
  jest.mocked(deleteRoutine).mockResolvedValue(undefined);
});
afterEach(() => { queryClient?.clear(); });

it('creates a routine, invalidates the routine query, resets the editor, and confirms success', async () => {
  await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre de rutina'), ' Tren inferior ');
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar rutina' }));

  await waitFor(() => expect(screen.getByText('Rutina creada correctamente.')).toBeTruthy());
  expect(screen.queryByLabelText('Nombre de rutina')).toBeNull();
  expect(queryClient.getQueryState(['routines'])?.isInvalidated).toBe(true);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
});

it('sends every editable routine field within its valid bounds', async () => {
  await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre de rutina'), 'Piernas');
  await fireEvent.changeText(screen.getByLabelText('Día de la semana'), '3');
  await fireEvent.changeText(screen.getByLabelText('Notas de rutina'), 'Trabajo pesado');
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  await fireEvent.changeText(screen.getByLabelText('Series de Sentadilla'), '2');
  await fireEvent.changeText(screen.getByLabelText('Repeticiones de Sentadilla'), '6');
  await fireEvent.changeText(screen.getByLabelText('Peso kg de Sentadilla'), '75');
  await fireEvent.changeText(screen.getByLabelText('Notas de Sentadilla'), 'Pausa abajo');
  await fireEvent.press(screen.getByRole('button', { name: 'Configurar plan por serie de Sentadilla' }));
  await fireEvent.changeText(screen.getByLabelText('Repeticiones plan 1 de Sentadilla'), '6');
  await fireEvent.changeText(screen.getByLabelText('Peso plan 1 de Sentadilla'), '75');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar rutina' }));

  await waitFor(() => expect(createRoutine).toHaveBeenCalledWith(session, {
    name: 'Piernas', dayOfWeek: 3, notes: 'Trabajo pesado', exercises: [{
      exerciseId: 'exercise-1', order: 0, targetSets: 2, targetReps: 6, targetWeightKg: 75,
      notes: 'Pausa abajo', seriesPlan: [{ reps: 6, weightKg: 75 }, { reps: undefined, weightKg: undefined }],
    }],
  }));
});

it('edits an existing routine', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Editar Piernas' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre de rutina'), 'Piernas pesadas');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(updateRoutine).toHaveBeenCalledWith(session, 'routine-1', expect.objectContaining({ name: 'Piernas pesadas' })));
  expect(screen.getByText('Rutina actualizada correctamente.')).toBeTruthy();
});

it('prevents an exercise from being added twice', async () => {
  await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Sentadilla ya está en la rutina.');
  expect(screen.getByText('1. Sentadilla')).toBeTruthy();
  expect(screen.queryByText('2. Sentadilla')).toBeNull();
});

it('preserves the draft order when an exercise moves up', async () => {
  await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Peso muerto' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Subir Peso muerto' }));
  expect(screen.getByText('1. Peso muerto')).toBeTruthy();
  expect(screen.getByText('2. Sentadilla')).toBeTruthy();
});

it('requires confirmation and supports cancellation before deleting', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Piernas' }));
  expect(screen.getByText('¿Eliminar la rutina Piernas?')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar eliminación' }));
  expect(deleteRoutine).not.toHaveBeenCalled();
  expect(screen.getByText('Piernas')).toBeTruthy();
});

it('keeps an editor draft and failed deletion visible for recovery', async () => {
  jest.mocked(createRoutine).mockRejectedValueOnce(new Error('No se pudo conectar'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre de rutina'), 'Borrador local');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar rutina' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar'));
  expect(screen.getByLabelText('Nombre de rutina')).toHaveProp('value', 'Borrador local');

  jest.mocked(deleteRoutine).mockRejectedValueOnce(new Error('No se pudo eliminar'));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar edición' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Piernas' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo eliminar'));
  expect(screen.getByText('Piernas')).toBeTruthy();
});

it('disables routine mutations against stale cached data with a connectivity notice', async () => {
  await show({ routinesStale: true });
  expect(screen.getByText('Conéctate para administrar rutinas. La copia local puede estar desactualizada.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Crear rutina' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Editar Piernas' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Eliminar Piernas' })).toBeDisabled();
});

it('keeps exercise preview and addition as separate controls', async () => {
  await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Ver Sentadilla' }));
  expect(screen.getByLabelText('Vista previa de Sentadilla')).toBeTruthy();
  expect(screen.queryByText('1. Sentadilla')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Agregar Sentadilla' }));
  expect(screen.getByText('1. Sentadilla')).toBeTruthy();
});

it('uses the existing searchable and paginated exercise catalog for routine drafts', async () => {
  const { onSearchChange } = await show({ routines: [] });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.changeText(screen.getByLabelText('Buscar ejercicio para rutina'), 'peso');
  expect(onSearchChange).toHaveBeenCalledWith('peso');
  expect(screen.getByRole('button', { name: 'Página siguiente del catálogo' })).toBeTruthy();
});

it('shows distinct loading, recoverable error, stale notice, and successful empty catalog states', async () => {
  const view = await show({ routines: [], catalogLoading: true, catalogSuccess: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  expect(screen.getByText('Cargando catálogo…')).toBeTruthy();

  await view.rerender(<QueryClientProvider client={queryClient}>{manager({ routines: [], catalogError: new Error('No hay conexión'), catalogSuccess: false })}</QueryClientProvider>);
  expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión');
  expect(screen.getByRole('button', { name: 'Reintentar catálogo' })).toBeTruthy();

  await view.rerender(<QueryClientProvider client={queryClient}>{manager({ routines: [], exercises: [], catalogNotice: 'Mostrando copia local.', catalogSource: 'cache', catalogSuccess: true })}</QueryClientProvider>);
  expect(screen.getByText('Mostrando copia local.')).toBeTruthy();
  expect(screen.getByText('No hay coincidencias en la copia local.')).toBeTruthy();
});

it('keeps a completed mutation successful when cache refresh or haptics fail', async () => {
  await show({ routines: [] });
  jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(new Error('Cache no disponible'));
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('Haptics no disponible'));
  await fireEvent.press(screen.getByRole('button', { name: 'Crear rutina' }));
  await fireEvent.changeText(screen.getByLabelText('Nombre de rutina'), 'Rutina remota');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar rutina' }));
  await waitFor(() => expect(screen.getByText('Rutina creada correctamente.')).toBeTruthy());
  expect(screen.queryByLabelText('Nombre de rutina')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('disables an already open editor and delete confirmation when routines become stale', async () => {
  const view = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Editar Piernas' }));
  await view.rerender(<QueryClientProvider client={queryClient}>{manager({ routinesStale: true })}</QueryClientProvider>);
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Agregar Sentadilla' })).toBeDisabled();
  expect(screen.getByLabelText('Nombre de rutina')).toHaveProp('editable', false);

  await view.rerender(<QueryClientProvider client={queryClient}>{manager()}</QueryClientProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar edición' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar Piernas' }));
  await view.rerender(<QueryClientProvider client={queryClient}>{manager({ routinesStale: true })}</QueryClientProvider>);
  expect(screen.getByText('¿Eliminar la rutina Piernas?')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar eliminación' })).toBeDisabled();
});
