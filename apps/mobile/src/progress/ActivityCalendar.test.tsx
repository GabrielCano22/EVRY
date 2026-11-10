import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MobileSession } from '../api/client';
import { ActivityCalendar } from './ActivityCalendar';

const mockGet = jest.fn();
jest.mock('../api/client', () => ({ withMobileAuth: (fn: (client: unknown) => unknown) => fn({ GET: mockGet }) }));
const session = { userId: 'calendar-user', version: 1, serverUrl: 'https://example.test/api/v1' } as MobileSession;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-09T02:00:00Z'));
  mockGet.mockReset().mockImplementation(async (path: string) => path === '/cycle/entries'
    ? { data: [{ date: '2026-11-08T00:00:00Z' }] }
    : { data: { days: [{ date: '2026-11-08', sessions: [{ id: 'one' }] }] } });
});
afterEach(() => jest.useRealTimers());

it('uses Bogotá civil dates and does not request cycle data without consent', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  await screen.findByLabelText('2026-11-08, entrenamiento');
  expect(screen.getByText('Calendario de entrenamientos')).toBeTruthy();
  expect(screen.queryByText(/registro de ciclo/i)).toBeNull();
  expect(mockGet).toHaveBeenCalledWith('/progress/activity', expect.objectContaining({ params: { query: { from: '2026-11-01', to: '2026-11-08' } } }));
  expect(mockGet.mock.calls.some(([path]) => path === '/cycle/entries')).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/progress/activity', expect.objectContaining({ params: { query: { from: '2026-10-01', to: '2026-10-31' } } })));
  client.clear();
});

it('combines real cycle and training markers when cycle is enabled', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle /></QueryClientProvider>);
  expect(await screen.findByLabelText('2026-11-08, registro de ciclo, entrenamiento')).toBeTruthy();
  expect(screen.getByText('Calendario de entrenamientos y ciclo')).toBeTruthy();
  client.clear();
});

it('hides cached cycle records when consent is withdrawn while keeping workouts', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle /></QueryClientProvider>);
  await screen.findByLabelText('2026-11-08, registro de ciclo, entrenamiento');
  await view.rerender(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  expect(screen.getByLabelText('2026-11-08, entrenamiento')).toBeTruthy();
  expect(screen.getByText('Calendario de entrenamientos')).toBeTruthy();
  expect(screen.queryByText(/registro de ciclo/i)).toBeNull();
  client.clear();
});

it('shows combined mode even when there are no cycle records', async () => {
  mockGet.mockImplementation(async (path: string) => path === '/cycle/entries'
    ? { data: [] } : { data: { days: [{ date: '2026-11-08', sessions: [{ id: 'one' }] }] } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle /></QueryClientProvider>);
  await screen.findByLabelText('2026-11-08, entrenamiento');
  expect(screen.getByText('Calendario de entrenamientos y ciclo')).toBeTruthy();
  client.clear();
});

it('does not query future months and returns to the current month', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle /></QueryClientProvider>);
  await screen.findByLabelText('2026-11-08, registro de ciclo, entrenamiento');
  const requests = mockGet.mock.calls.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Mes siguiente' }));
  expect(screen.getByText('Mes futuro: aún no hay entrenamientos completados.')).toBeTruthy();
  expect(mockGet).toHaveBeenCalledTimes(requests);
  await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  expect(await screen.findByLabelText('2026-11-08, registro de ciclo, entrenamiento')).toBeTruthy();
  client.clear();
});

it('reports incomplete data and permits retry after an activity request fails', async () => {
  mockGet.mockImplementation(async (path: string) => path === '/progress/activity'
    ? { error: { message: 'No disponible' } } : { data: [] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  expect(await screen.findByText(/el calendario puede estar incompleto/)).toBeTruthy();
  mockGet.mockResolvedValue({ data: { days: [{ date: '2026-11-08', sessions: [{ id: 'one' }] }] } });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar entrenamientos' }));
  expect(await screen.findByLabelText('2026-11-08, entrenamiento')).toBeTruthy();
  client.clear();
});
