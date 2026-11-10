import { cleanup, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProgressScreen from '../../app/(tabs)/progress';

jest.mock('../auth/session-store', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({
    session: { userId: 'offline-user', version: 1 }, user: { biologicalSex: 'MALE', trackCycle: false },
  }),
}));
jest.mock('../api/client', () => ({ withMobileAuth: jest.fn().mockRejectedValue(new Error('Sin conexión')) }));
jest.mock('./ActivityCalendar', () => ({ ActivityCalendar: () => null }));
jest.mock('./ExerciseProgressPanel', () => ({ ExerciseProgressPanel: () => null }));
jest.mock('./WeeklyMuscleMap', () => ({ WeeklyMuscleMap: () => {
  const { Text } = jest.requireActual('react-native');
  return <Text>Mapa semanal disponible</Text>;
} }));

it('keeps the weekly map available when overview metrics cannot be loaded', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(<QueryClientProvider client={client}><ProgressScreen /></QueryClientProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso.');
  expect(screen.getByText('Mapa semanal disponible')).toBeTruthy();
  await cleanup(); client.clear();
}, process.platform === 'win32' && !process.env.CI ? 60_000 : 10_000);
