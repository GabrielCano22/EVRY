import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Image } from 'expo-image';
import TrainScreen from '../../app/(tabs)/train';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from '../training/training-store';
import { loadExercises, loadRoutines, type ExerciseResult } from './catalog';

jest.mock('./catalog', () => ({ loadExercises: jest.fn(), loadRoutines: jest.fn() }));

let queryClient: QueryClient;
const items = Array.from({ length: 31 }, (_, index) => ({ id: `exercise-${index + 1}`, name: `Ejercicio ${index + 1}`, imagePath: `images/${index + 1}.jpg`, gifPath: `videos/${index + 1}.gif` }));
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
  const images = screen.UNSAFE_getAllByType(Image);
  expect(images.length).toBeGreaterThanOrEqual(30);
  expect(images.every((image) => image.props.source.uri.endsWith('.jpg'))).toBe(true);
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
