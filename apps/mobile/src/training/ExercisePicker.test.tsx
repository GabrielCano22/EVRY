import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExercisePicker } from './ExercisePicker';
import { loadExercises, type Exercise } from '../catalog/catalog';

jest.mock('../catalog/catalog', () => ({ loadExercises: jest.fn() }));
jest.mock('../catalog/thumbnail-files', () => ({ mobileThumbnailCache: { resolve: async (_owner: unknown, url: string) => url } }));

const session = { userId: 'user-1', serverUrl: 'https://api.example.com/api/v1', version: 1 };
const exercise = (id: string, name: string, overrides: Partial<Exercise> = {}): Exercise => ({
  id, sourceId: null, name, muscleGroup: 'CHEST', equipment: 'BARBELL', category: null, imagePath: null, gifPath: null,
  target: null, bodyPart: null, secondaryMuscles: [], equipmentLabel: null, isCustom: false, ownerId: null,
  isCompound: true, tags: [], description: null, mediaId: null, attribution: null, imageUrl: null, gifUrl: null,
  ...overrides,
});
const page = (items: Exercise[]) => ({ items, page: 1, limit: 30, total: items.length, hasMore: false, source: 'server' as const, stale: false, notice: null, updatedAt: '2026-11-12T10:00:00.000Z' });

let queryClient: QueryClient;
const show = async (onPick = jest.fn()) => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={queryClient}>
    <ExercisePicker onClose={jest.fn()} onPick={onPick} session={session} visible />
  </QueryClientProvider>);
  return { onPick };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadExercises).mockResolvedValue(page([
    exercise('exercise-1', 'Press banca'),
    exercise('exercise-2', 'Remo con barra', { muscleGroup: 'BACK' }),
  ]));
});
afterEach(async () => {
  await act(async () => { queryClient?.clear(); });
});

it('adds an exercise and closes the search state', async () => {
  const { onPick } = await show();
  await fireEvent.press(await screen.findByRole('button', { name: 'Agregar Press banca' }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'exercise-1' }));
  expect(loadExercises).toHaveBeenLastCalledWith(session, expect.objectContaining({ search: '', page: 1 }));
});

it('filters by muscle group and equipment through the catalog request', async () => {
  await show();
  await screen.findByText('Press banca');
  await fireEvent.press(screen.getByRole('button', { name: 'Filtrar por Pecho' }));
  await waitFor(() => expect(loadExercises).toHaveBeenLastCalledWith(
    session,
    expect.objectContaining({ muscleGroup: 'CHEST', page: 1 }),
  ));
  await fireEvent.press(screen.getByRole('button', { name: 'Filtrar por Mancuernas' }));
  await waitFor(() => expect(loadExercises).toHaveBeenLastCalledWith(
    session,
    expect.objectContaining({ muscleGroup: 'CHEST', equipment: 'DUMBBELL', page: 1 }),
  ));
  expect(screen.getByText('Pecho · Mancuernas')).toBeTruthy();
});

it('clears both filters at once', async () => {
  await show();
  await screen.findByText('Press banca');
  await fireEvent.press(screen.getByRole('button', { name: 'Filtrar por Pecho' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Filtrar por Mancuernas' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtros del catálogo' }));
  await waitFor(() => expect(loadExercises).toHaveBeenLastCalledWith(session, expect.objectContaining({ search: '', page: 1 })));
  const last = jest.mocked(loadExercises).mock.calls.at(-1)![1];
  expect(last).not.toHaveProperty('muscleGroup');
  expect(last).not.toHaveProperty('equipment');
});

it('shows the shared preview without adding the exercise', async () => {
  const { onPick } = await show();
  await screen.findByText('Press banca');
  await fireEvent.press(screen.getByRole('button', { name: 'Ver Press banca' }));
  expect(await screen.findByLabelText('Vista previa de Press banca')).toBeTruthy();
  expect(onPick).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cerrar vista previa' }));
  expect(screen.queryByLabelText('Vista previa de Press banca')).toBeNull();
});

it('shows the offline filter error instead of unfiltered cached data', async () => {
  jest.mocked(loadExercises).mockRejectedValue(new Error('Los filtros del catálogo necesitan conexión. Quita los filtros o reintenta.'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Filtrar por Pecho' }));
  expect(await screen.findByText('Los filtros del catálogo necesitan conexión. Quita los filtros o reintenta.')).toBeTruthy();
});
