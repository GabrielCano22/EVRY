import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainScreen from '../../app/(tabs)/train';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from '../training/training-store';
import { loadExercises, loadRoutines, type Exercise, type ExerciseResult } from './catalog';

jest.mock('./catalog', () => ({ loadExercises: jest.fn(), loadRoutines: jest.fn() }));

let queryClient: QueryClient;
const exercise = (index: number): Exercise => ({
  id: `exercise-${index}`, sourceId: null, name: `Ejercicio ${index}`, muscleGroup: 'QUADS', equipment: 'BARBELL',
  category: null, imagePath: `images/${index}.jpg`, gifPath: `videos/${index}.gif`, target: null, bodyPart: null,
  secondaryMuscles: [], equipmentLabel: null, isCustom: false, ownerId: null, isCompound: true, tags: [],
  description: null, mediaId: null, attribution: null, imageUrl: null, gifUrl: null,
});
const items = Array.from({ length: 31 }, (_, index) => exercise(index + 1));
const result = (page = 1): ExerciseResult => ({ items: items.slice((page - 1) * 30, page * 30), page, limit: 30, total: 31, hasMore: page === 1, source: 'server', stale: false, notice: null, updatedAt: '2026-08-30T10:00:00Z' });

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  useSessionStore.setState({ session: { userId: 'user-a', serverUrl: 'http://10.0.2.2:4000/api/v1', version: 1 } });
  useTrainingStore.setState({ activeWorkout: { clientId: 'workout-a', revision: 0, status: 'ACTIVE', name: 'Fuerza', startedAt: '2026-08-30T10:00:00Z', notes: null, sets: [], deletedSetClientIds: [] } });
  jest.mocked(loadExercises).mockImplementation(async (_session, options) => result(options?.page));
  jest.mocked(loadRoutines).mockResolvedValue({ items: [], source: 'server', stale: false, notice: null, updatedAt: null });
});
afterEach(() => { queryClient.clear(); });
const show = () => render(<QueryClientProvider client={queryClient}><TrainScreen /></QueryClientProvider>);

it('shows all 30 exercises and navigates to the remaining page without auto-loading GIFs', async () => {
  await show();
  expect(await screen.findByText('Ejercicio 30')).toBeTruthy();
  const images = screen.getAllByLabelText(/Miniatura de/);
  expect(images.length).toBeGreaterThanOrEqual(30);
  expect(images.every((image) => JSON.stringify(image.props.source).includes('.jpg'))).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Página siguiente' }));
  expect(await screen.findAllByText('Ejercicio 31')).not.toHaveLength(0);
  expect(screen.queryByText('Ejercicio 30')).toBeNull();
}, 20_000);

it('shows cached catalog limitations separately from a successful empty server result', async () => {
  jest.mocked(loadExercises).mockResolvedValue({ ...result(), items: [], total: 0, hasMore: false, source: 'cache', stale: true, notice: 'Mostrando copia local desactualizada.' });
  await show();
  expect(await screen.findByText('Mostrando copia local desactualizada.')).toBeTruthy();
  expect(screen.getByText(/No hay coincidencias en la copia local/)).toBeTruthy();
}, 20_000);

it('offers recovery for failed routine queries instead of silently hiding the failure', async () => {
  useTrainingStore.setState({ activeWorkout: null });
  jest.mocked(loadRoutines).mockRejectedValue(new Error('No hay copia local de rutinas.'));
  await show();
  expect(await screen.findByText('No hay copia local de rutinas.')).toBeTruthy();
  jest.mocked(loadRoutines).mockResolvedValue({ items: [], source: 'server', stale: false, notice: null, updatedAt: null });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar rutinas' }));
  expect(await screen.findByText(/No tienes rutinas guardadas/)).toBeTruthy();
}, 20_000);

it('uses the server media URL and only switches the detail to GIF after pressing play', async () => {
  jest.mocked(loadExercises).mockResolvedValue({ ...result(), items: [{ ...items[0], imageUrl: 'https://cdn.example/one.jpg', gifUrl: 'https://cdn.example/one.gif' }], total: 1, hasMore: false });
  await show();
  const thumbnail = await screen.findByLabelText('Miniatura de Ejercicio 1');
  expect(JSON.stringify(thumbnail.props.source)).toContain('https://cdn.example/one.jpg');
  expect(JSON.stringify(screen.getByLabelText('Demostración de Ejercicio 1').props.source)).toContain('https://cdn.example/one.jpg');
  await fireEvent.press(screen.getByRole('button', { name: 'Reproducir GIF' }));
  expect(JSON.stringify(screen.getByLabelText('Demostración de Ejercicio 1').props.source)).toContain('https://cdn.example/one.gif');
  expect(JSON.stringify(screen.getByLabelText('Miniatura de Ejercicio 1').props.source)).toContain('https://cdn.example/one.jpg');
  await fireEvent.press(screen.getByRole('button', { name: 'Detener demostración' }));
  expect(JSON.stringify(screen.getByLabelText('Demostración de Ejercicio 1').props.source)).toContain('https://cdn.example/one.jpg');
});

it('resets pagination and stops a playing GIF when changing the search', async () => {
  jest.mocked(loadExercises).mockImplementation(async (_session, options) => options?.search
    ? { ...result(options?.page), items: options.page === 1 ? [items[1]] : [], hasMore: false, total: 1 }
    : result(options?.page));
  await show();
  await screen.findByText('Ejercicio 30');
  await fireEvent.press(screen.getByRole('button', { name: 'Página siguiente' }));
  await screen.findByLabelText('Demostración de Ejercicio 31');
  await fireEvent.press(screen.getByRole('button', { name: 'Reproducir GIF' }));
  await fireEvent.changeText(screen.getByLabelText('Buscar ejercicio'), 'Ejercicio 2');
  expect(await screen.findByLabelText('Demostración de Ejercicio 2')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Reproducir GIF' })).toBeTruthy();
});

it('keeps the original attribution visible alongside the exercise media', async () => {
  jest.mocked(loadExercises).mockResolvedValue({ ...result(), items: [{ ...items[0], attribution: '© Gym visual — https://gymvisual.com/' }], total: 1, hasMore: false });
  await show();
  expect(await screen.findByText('© Gym visual — https://gymvisual.com/')).toBeTruthy();
});
