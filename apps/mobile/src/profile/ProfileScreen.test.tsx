import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import ProfileScreen from '../../app/(tabs)/profile';

jest.setTimeout(15_000);

const mockPatch = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockRefreshUser = jest.fn();
const mockLogout = jest.fn();
const mockSessionState = {
  session: { userId: 'user-1', serverUrl: 'https://api.example.com/api/v1', version: 1 },
  user: {
    id: 'user-1',
    email: 'profile@example.com',
    name: 'Ada',
    biologicalSex: 'FEMALE' as const,
    birthDate: '1994-02-15T00:00:00.000Z',
    goals: ['STRENGTH'] as ('STRENGTH')[],
    trackCycle: false,
    avgCycleLen: 28,
    avgPeriodLen: 5,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  refreshUser: mockRefreshUser,
  logout: mockLogout,
};
const readinessFixture = { id: 'readiness-1', userId: 'user-1', date: '2026-10-07T14:00:00.000Z',
  civilDate: '2026-10-07T00:00:00.000Z', sleepHrs: 7, stress: 3, soreness: 2, motivation: 3 };

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/src/api/client', () => ({
  isCurrentMobileSession: () => true,
  withMobileAuth: jest.fn(async (operation: (client: {
    GET: typeof mockGet;
    PATCH: typeof mockPatch;
    POST: typeof mockPost;
  }) => unknown) => operation({ GET: mockGet, PATCH: mockPatch, POST: mockPost })),
  apiError: jest.fn((error: { code?: string; message?: string } | undefined, fallback: string, status?: number) => {
    const normalized = new Error(error?.message ?? fallback) as Error & { code?: string; status?: number };
    normalized.code = error?.code;
    normalized.status = status;
    return normalized;
  }),
}));
jest.mock('@/src/auth/session-store', () => ({
  useSessionStore: jest.fn((selector: (state: typeof mockSessionState) => unknown) => selector(mockSessionState)),
}));
jest.mock('@/src/db/database', () => ({
  loadRestPreferences: jest.fn(async () => ({ defaultRestSeconds: 120, restSecondsByExerciseId: {} })),
  saveRestPreferences: jest.fn(async () => undefined),
}));

let queryClient: QueryClient | undefined;

async function show() {
  queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  return await render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
}

function response<T>(data: T, status = 200) {
  return { data, error: undefined, response: { status } };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Haptics.impactAsync).mockReset().mockResolvedValue(undefined);
  jest.mocked(Haptics.notificationAsync).mockReset().mockResolvedValue(undefined);
  jest.mocked(Haptics.selectionAsync).mockReset().mockResolvedValue(undefined);
  mockGet.mockResolvedValue(response({ ...readinessFixture, score: 73 }));
  mockPost.mockResolvedValue(response({ ...readinessFixture, score: 81 }));
  mockPatch.mockResolvedValue(response({
    id: 'user-1',
    email: 'profile@example.com',
    name: 'Ada Canonical',
    biologicalSex: 'OTHER',
    birthDate: '1995-03-04T00:00:00.000Z',
    goals: ['HYPERTROPHY', 'MOBILITY'],
    trackCycle: true,
    avgCycleLen: 30,
    avgPeriodLen: 6,
  }));
  mockRefreshUser.mockResolvedValue(undefined);
});

afterEach(() => {
  queryClient?.clear();
});

it('renders every editable field and submits all normalized values after independent goal toggles', async () => {
  await show();
  await fireEvent.changeText(screen.getByLabelText('Nombre'), '  Ada Lovelace  ');
  await fireEvent.changeText(screen.getByLabelText('Fecha de nacimiento'), '1995-03-04');
  await fireEvent.press(screen.getByRole('button', { name: 'Sexo biológico: Otro' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Objetivo: Fuerza' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Objetivo: Hipertrofia' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Objetivo: Movilidad' }));
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText('Promedio de ciclo (días)'), '30');
  await fireEvent.changeText(screen.getByLabelText('Promedio de periodo (días)'), '6');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/users/me', {
    body: {
      name: 'Ada Lovelace',
      biologicalSex: 'OTHER',
      birthDate: '1995-03-04',
      goals: ['HYPERTROPHY', 'MOBILITY'],
      trackCycle: true,
      avgCycleLen: 30,
      avgPeriodLen: 6,
    },
  }));
  expect(await screen.findByText('Perfil guardado.')).toBeTruthy();
  expect(await screen.findByText('Puntaje actual: 73/100')).toBeTruthy();
  expect(screen.getByText('Formato: YYYY-MM-DD')).toBeTruthy();
});

it('shows local name, date, and cycle errors without attempting a mutation', async () => {
  await show();
  await fireEvent.changeText(screen.getByLabelText('Nombre'), ' ');
  await fireEvent.changeText(screen.getByLabelText('Fecha de nacimiento'), '9999-12-31');
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText('Promedio de ciclo (días)'), '19');
  await fireEvent.changeText(screen.getByLabelText('Promedio de periodo (días)'), '11');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  expect(screen.getByText('El nombre es obligatorio.')).toBeTruthy();
  expect(screen.getByText('La fecha de nacimiento no puede ser futura.')).toBeTruthy();
  expect(screen.getByText('El ciclo promedio debe estar entre 20 y 45 días.')).toBeTruthy();
  expect(screen.getByText('El periodo promedio debe estar entre 2 y 10 días.')).toBeTruthy();
  expect(mockPatch).not.toHaveBeenCalled();
});

it('offers cycle tracking independently of sex and restores valid canonical lengths when re-enabled', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Sexo biológico: Hombre' }));
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText('Promedio de ciclo (días)'), '19');
  await fireEvent.changeText(screen.getByLabelText('Promedio de periodo (días)'), '11');
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', false);

  expect(screen.queryByLabelText('Promedio de ciclo (días)')).toBeNull();
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', true);
  expect(screen.getByDisplayValue('28')).toBeTruthy();
  expect(screen.getByDisplayValue('5')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/users/me', {
    body: expect.objectContaining({ biologicalSex: 'MALE', trackCycle: true, avgCycleLen: 28, avgPeriodLen: 5 }),
  }));
  expect(await screen.findByText('Perfil guardado.')).toBeTruthy();
});

it('keeps entered values and renders backend field errors after a failed mutation', async () => {
  mockPatch.mockResolvedValueOnce({
    data: undefined,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Revisa los campos indicados.',
      fieldErrors: { name: ['Ese nombre no está disponible.'], birthDate: ['Confirma la fecha.'] },
      retryable: false,
      requestId: 'request-profile-1',
    },
    response: { status: 400 },
  });
  await show();
  await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Borrador visible');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  expect(await screen.findByText('Revisa los campos indicados.')).toBeTruthy();
  expect(screen.getByText('Ese nombre no está disponible.')).toBeTruthy();
  expect(screen.getByText('Confirma la fecha.')).toBeTruthy();
  expect(screen.getByDisplayValue('Borrador visible')).toBeTruthy();
});

it('refreshes the account, displays the confirmed canonical response, and uses moderate profile haptics', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  expect(await screen.findByText('Perfil guardado.')).toBeTruthy();
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue('Ada Canonical')).toBeTruthy();
  expect(screen.getByLabelText('Sexo biológico: Otro').props.accessibilityState.selected).toBe(true);
  expect(screen.getByLabelText('Objetivo: Hipertrofia').props.accessibilityState.selected).toBe(true);
  expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

it('retains the confirmed mutation response when refreshing the account fails', async () => {
  mockRefreshUser.mockRejectedValueOnce(new Error('Sin conexión'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));

  expect(await screen.findByText('Perfil guardado.')).toBeTruthy();
  expect(screen.getByDisplayValue('Ada Canonical')).toBeTruthy();
  expect(screen.queryByText('Sin conexión')).toBeNull();
});

it.each([
  ['profile', 'Guardar perfil', 'Perfil guardado.'],
  ['readiness', 'Guardar readiness', 'Readiness guardado para hoy.'],
] as const)('does not leave the confirmed %s save pending while optional vibration is unfinished', async (kind, button, confirmation) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const feedback = kind === 'profile' ? Haptics.impactAsync : Haptics.notificationAsync;
  jest.mocked(feedback).mockReturnValueOnce(pending);
  try {
    await show();
    await screen.findByText('Puntaje actual: 73/100');
    await fireEvent.press(screen.getByRole('button', { name: button }));
    expect(await screen.findByText(confirmation)).toBeTruthy();
    expect(screen.getByRole('button', { name: button })).not.toBeDisabled();
    expect(screen.queryByRole('alert')).toBeNull();
  } finally {
    await act(async () => { release(); });
  }
});

it('keeps readiness edits and their save working when stepper vibration rejects', async () => {
  jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Vibración de control no disponible'));
  await show();
  await screen.findByText('Puntaje actual: 73/100');
  await fireEvent.press(screen.getByRole('button', { name: 'Aumentar Estrés' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar readiness' }));
  expect(await screen.findByText('Readiness guardado para hoy.')).toBeTruthy();
  expect(mockPost).toHaveBeenCalledWith('/readiness/checkin', { body: expect.objectContaining({ stress: 4 }) });
  expect(screen.queryByText('Vibración de control no disponible')).toBeNull();
});

it('disables repeated profile submission while the update is pending', async () => {
  let resolvePatch: ((value: ReturnType<typeof response>) => void) | undefined;
  mockPatch.mockImplementationOnce(() => new Promise((resolve) => { resolvePatch = resolve; }));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar perfil' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled());
  await fireEvent.press(screen.getByRole('button', { name: 'Guardando…' }));
  expect(mockPatch).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolvePatch?.(response({
      id: 'user-1', email: 'profile@example.com', name: 'Ada', biologicalSex: 'FEMALE',
      birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5,
    }));
  });
  expect(await screen.findByText('Perfil guardado.')).toBeTruthy();
});

it('keeps readiness loading, save success, and haptics separate from profile feedback', async () => {
  let resolveReadiness: ((value: ReturnType<typeof response>) => void) | undefined;
  mockGet.mockImplementationOnce(() => new Promise((resolve) => { resolveReadiness = resolve; }));
  await show();
  expect(screen.queryByText(/Puntaje actual:/)).toBeNull();
  expect(screen.queryByText('No pudimos consultar el registro de hoy.')).toBeNull();

  await act(async () => {
    resolveReadiness?.(response({ ...readinessFixture, score: 73 }));
  });
  expect(await screen.findByText('Puntaje actual: 73/100')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar readiness' }));
  expect(await screen.findByText('Readiness guardado para hoy.')).toBeTruthy();
  expect(screen.queryByText('Perfil guardado.')).toBeNull();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

it('shows a readiness query error without profile mutation feedback', async () => {
  mockGet.mockResolvedValueOnce({ data: undefined, error: { message: 'No disponible' }, response: { status: 503 } });
  await show();

  expect(await screen.findByText('No pudimos consultar el registro de hoy.')).toBeTruthy();
  expect(screen.queryByText('Perfil guardado.')).toBeNull();
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
});

it('keeps a confirmed readiness save successful when optional native haptics reject', async () => {
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('Vibración no disponible'));
  const savedReadiness = {
    id: 'readiness-1', userId: 'user-1', date: '2026-10-07T14:00:00.000Z',
    civilDate: '2026-10-07T00:00:00.000Z', sleepHrs: 7, stress: 3, soreness: 2, motivation: 3, score: 81,
  };
  mockGet.mockResolvedValue(response({ ...savedReadiness, score: 73 }));
  mockPost.mockResolvedValue(response(savedReadiness));
  await show();
  expect(await screen.findByText('Puntaje actual: 73/100')).toBeTruthy();
  mockGet.mockResolvedValue(response(savedReadiness));
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar readiness' }));

  expect(await screen.findByText('Readiness guardado para hoy.')).toBeTruthy();
  expect(await screen.findByText('Puntaje actual: 81/100')).toBeTruthy();
  expect(screen.queryByText('Vibración no disponible')).toBeNull();
  expect(mockPost).toHaveBeenCalledTimes(1);
});

it('keeps a failed readiness save visible without success feedback or vibration', async () => {
  mockGet.mockResolvedValue(response({
    id: 'readiness-1', userId: 'user-1', date: '2026-10-07T14:00:00.000Z',
    civilDate: '2026-10-07T00:00:00.000Z', sleepHrs: 7, stress: 3, soreness: 2, motivation: 3, score: 73,
  }));
  mockPost.mockResolvedValueOnce({ data: undefined, error: { message: 'No disponible' }, response: { status: 503 } });
  await show();
  expect(await screen.findByText('Puntaje actual: 73/100')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar readiness' }));

  expect(await screen.findByText('No se pudo guardar el readiness.')).toBeTruthy();
  expect(screen.getByText('Puntaje actual: 73/100')).toBeTruthy();
  expect(screen.queryByText('Readiness guardado para hoy.')).toBeNull();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});
