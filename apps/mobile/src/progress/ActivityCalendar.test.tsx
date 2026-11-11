import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MobileSession } from '../api/client';
import { loadUiPreference, saveUiPreference } from '../db/database';
import { ActivityCalendar } from './ActivityCalendar';

const mockGet = jest.fn();
jest.mock('../api/client', () => ({
  isCurrentMobileSession: () => true,
  withMobileAuth: (fn: (client: unknown) => unknown) => fn({ GET: mockGet }),
}));
jest.mock('../db/database', () => ({
  loadUiPreference: jest.fn(async () => null),
  saveUiPreference: jest.fn(async () => undefined),
}));
const session = { userId: 'calendar-user', version: 1, serverUrl: 'https://example.test/api/v1' } as MobileSession;

const cycleEntry = {
  id: 'cycle-1', userId: 'calendar-user', date: '2026-11-08T00:00:00.000Z', flow: 'MEDIUM',
  symptoms: ['Cólicos'], energy: 3, mood: 4, notes: null, isPeriodStart: false,
};
const workout = {
  id: 'one', userId: 'calendar-user', name: 'Piernas', status: 'COMPLETED',
  startedAt: '2026-11-08T15:00:00.000Z', endedAt: '2026-11-08T16:00:00.000Z',
  cancelledAt: null, clientId: null, lastSyncId: null, revision: 1, cyclePhase: null, notes: null,
  routineId: null, createdAt: '2026-11-08T15:00:00.000Z', updatedAt: '2026-11-08T16:00:00.000Z', routine: null,
  sets: [{
    id: 'set-1', workoutId: 'one', exerciseId: 'squat', order: 0, weightKg: 60, reps: 8, durationS: null,
    rpe: 8, isWarmup: false, setType: 'NORMAL', completedAt: '2026-11-08T15:10:00.000Z', clientMutationId: null,
    clientId: null, revision: 1, techniqueStable: null, updatedAt: '2026-11-08T15:10:00.000Z',
    exercise: { id: 'squat', name: 'Sentadilla' },
  }],
};

function activity(sessions: readonly unknown[] = [{ id: 'one', name: 'Piernas', volumeKg: 1250.5, setCount: 3, endedAt: '2026-11-08T16:00:00.000Z', cyclePhase: null }]) {
  return { data: { days: [{ date: '2026-11-08', sessions }] } };
}

async function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle /></QueryClientProvider>);
  return { client, view };
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-09T02:00:00Z'));
  jest.mocked(loadUiPreference).mockReset().mockResolvedValue(null);
  jest.mocked(saveUiPreference).mockReset().mockResolvedValue(undefined);
  mockGet.mockReset().mockImplementation(async (path: string) => {
    if (path === '/cycle/entries') return { data: [cycleEntry] };
    if (path === '/workouts/{id}') return { data: workout };
    return activity();
  });
});
afterEach(() => jest.useRealTimers());

it('uses Bogotá civil dates and does not request cycle data without consent', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  await screen.findByLabelText('8 de noviembre, entrenamiento, hoy');
  expect(screen.getByText('Calendario de entrenamientos')).toBeTruthy();
  expect(screen.queryByText(/registro de ciclo/i)).toBeNull();
  expect(mockGet).toHaveBeenCalledWith('/progress/activity', expect.objectContaining({ params: { query: { from: '2026-11-01', to: '2026-11-08' } } }));
  expect(mockGet.mock.calls.some(([path]) => path === '/cycle/entries')).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/progress/activity', expect.objectContaining({ params: { query: { from: '2026-10-01', to: '2026-10-31' } } })));
  client.clear();
});

it('combines real cycle and training markers when cycle is enabled', async () => {
  const { client } = await open();
  expect(await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy')).toBeTruthy();
  expect(screen.getByText('Calendario de entrenamientos y ciclo')).toBeTruthy();
  client.clear();
});

it('hides cached cycle records when consent is withdrawn while keeping workouts', async () => {
  const { client, view } = await open();
  await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy');
  await view.rerender(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  expect(screen.getByLabelText('8 de noviembre, entrenamiento, hoy')).toBeTruthy();
  expect(screen.getByText('Calendario de entrenamientos')).toBeTruthy();
  expect(screen.queryByText(/registro de ciclo/i)).toBeNull();
  client.clear();
});

it('shows combined mode even when there are no cycle records', async () => {
  mockGet.mockImplementation(async (path: string) => path === '/cycle/entries' ? { data: [] } : activity());
  const { client } = await open();
  await screen.findByLabelText('8 de noviembre, entrenamiento, hoy');
  expect(screen.getByText('Calendario de entrenamientos y ciclo')).toBeTruthy();
  client.clear();
});

it('does not query future months and returns to the current month', async () => {
  const { client } = await open();
  await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy');
  const requests = mockGet.mock.calls.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Mes siguiente' }));
  expect(screen.getByText('Mes futuro: aún no hay entrenamientos completados.')).toBeTruthy();
  expect(mockGet).toHaveBeenCalledTimes(requests);
  await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  expect(await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy')).toBeTruthy();
  client.clear();
});

it('reports incomplete data and permits retry after an activity request fails', async () => {
  mockGet.mockImplementation(async (path: string) => path === '/progress/activity'
    ? { error: { message: 'No disponible' } } : { data: [] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><ActivityCalendar session={session} trackCycle={false} /></QueryClientProvider>);
  expect(await screen.findByText(/el calendario puede estar incompleto/)).toBeTruthy();
  mockGet.mockResolvedValue(activity());
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar entrenamientos' }));
  expect(await screen.findByLabelText('8 de noviembre, entrenamiento, hoy')).toBeTruthy();
  client.clear();
});

it('opens the day sheet with the workout detail and the cycle entry of that day', async () => {
  const { client } = await open();
  await fireEvent.press(await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy'));
  expect(await screen.findByText('domingo, 8 de noviembre de 2026')).toBeTruthy();
  // The workout detail is a second query; with fake timers its observer
  // notification is scheduled, so flush it before reading the duration.
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(screen.getByText('Piernas')).toBeTruthy();
  expect(screen.getByText(/1:00:00/)).toBeTruthy();
  expect(screen.getByText('Flujo: Moderado')).toBeTruthy();
  expect(screen.getByText('Síntomas: Cólicos')).toBeTruthy();
  expect(screen.getByText('Energía: 3/5')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Ver sesión Piernas' }));
  expect(await screen.findByText('Sentadilla')).toBeTruthy();
  expect(screen.getByText('60 kg × 8 · RPE 8')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));
  expect(screen.getByText('Editar registro')).toBeTruthy();
  client.clear();
});

it('registers the cycle on the selected past day and blocks future days', async () => {
  mockGet.mockImplementation(async (path: string) => path === '/cycle/entries' ? { data: [] } : activity());
  const { client } = await open();
  await fireEvent.press(await screen.findByLabelText('8 de noviembre, entrenamiento, hoy'));
  await fireEvent.press(await screen.findByRole('button', { name: 'Registrar ciclo' }));
  expect(screen.getByText('Nuevo registro')).toBeTruthy();
  expect(screen.getByLabelText('Fecha del registro').props.value).toBe('2026-11-08');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

  await fireEvent.press(screen.getByLabelText('20 de noviembre, fecha futura'));
  expect(await screen.findByText('No se puede registrar el ciclo en una fecha futura.')).toBeTruthy();
  client.clear();
});

it('persists the local privacy switch and hides the cycle layer immediately', async () => {
  const { client } = await open();
  await screen.findByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy');
  await fireEvent(screen.getByLabelText('Ocultar capa de ciclo'), 'valueChange', false);
  expect(saveUiPreference).toHaveBeenCalledWith(session, 'cycle-layer-visible', 'false');
  await waitFor(() => expect(screen.getByLabelText('8 de noviembre, entrenamiento, hoy')).toBeTruthy());
  client.clear();
});

it('restores a hidden cycle layer from the local preference', async () => {
  jest.mocked(loadUiPreference).mockResolvedValue('false');
  const { client } = await open();
  await waitFor(() => expect(screen.getByLabelText('8 de noviembre, entrenamiento, hoy')).toBeTruthy());
  expect(screen.queryByLabelText(/registro de ciclo/)).toBeNull();
  expect(screen.getByText('Mostrar ciclo')).toBeTruthy();
  client.clear();
});

it('keeps the cycle out of the day sheet while the layer is hidden', async () => {
  jest.mocked(loadUiPreference).mockResolvedValue('false');
  const { client } = await open();
  await fireEvent.press(await screen.findByLabelText('8 de noviembre, entrenamiento, hoy'));
  expect(await screen.findByText(/La capa de ciclo está oculta/)).toBeTruthy();
  expect(screen.queryByText('Flujo: Moderado')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Mostrar capa de ciclo' }));
  await waitFor(() => expect(saveUiPreference).toHaveBeenCalledWith(session, 'cycle-layer-visible', 'true'));
  client.clear();
});
