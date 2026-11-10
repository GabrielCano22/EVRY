import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import TrainScreen from '../../app/(tabs)/train';
import { API_BASE_URL, captureMobileSession, currentUserWithRefresh, loginMobile } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { loadExercises, loadRoutines, type Exercise } from '../catalog/catalog';
import { useTrainingStore } from './training-store';
import type { LocalWorkout } from './workout-domain';

// The rendered screen, query observers, generated HTTP client and auth ownership
// checks are real. Replace native keychain/SQLite and external transport only.
jest.mock('@evry/api-client', () => {
  const actual = jest.requireActual<typeof import('@evry/api-client')>('@evry/api-client');
  return { ...actual, createEvryApiClient: (base: string, token: import('@evry/api-client').AccessTokenProvider) =>
    actual.createEvryApiClient(base, token, { fetch: request => globalThis.fetch(request) }) };
});
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    deleteItemAsync: async (key: string) => { values.delete(key); } };
});
jest.mock('../db/database', () => ({ getDatabase: jest.fn(), loadRestTimer: async () => null, saveRestTimer: async () => undefined }));
jest.mock('../catalog/catalog', () => ({ loadExercises: jest.fn(), loadRoutines: jest.fn() }));
jest.mock('../catalog/thumbnail-files', () => ({ mobileThumbnailCache: { resolve: async (_owner: unknown, url: string) => url } }));

type Advice = components['schemas']['AdaptiveRecommendation'];
const exercise = (id: string): Exercise => ({ id, sourceId: null, name: id, muscleGroup: 'QUADS', equipment: 'BARBELL',
  category: null, imagePath: null, gifPath: null, target: null, bodyPart: null, secondaryMuscles: [],
  equipmentLabel: null, isCustom: false, ownerId: null, isCompound: true, tags: [], description: null,
  mediaId: null, attribution: null, imageUrl: null, gifUrl: null });
const workout: LocalWorkout = { clientId: 'advice-workout', revision: 0, status: 'ACTIVE', name: 'Fuerza offline',
  startedAt: '2026-10-07T12:00:00Z', notes: null, deletedSetClientIds: [], sets: [] };
const hold: Advice = { exerciseId: 'Sentadilla', targetWeightKg: null, targetReps: null, action: 'HOLD',
  confidence: 0, rationale: ['Aún no hay dos sesiones comparables para sugerir una carga.'] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const originalFetch = globalThis.fetch;
let http: jest.Mock<Promise<Response>, [Request]>;
let client: QueryClient;
let adviceTransport: (request: Request) => Promise<Response>;
let sent: Request[];
async function signIn(id = 'advice-user') {
  await loginMobile(`${id}@example.com`, 'valid-password');
  const user = await currentUserWithRefresh();
  const session = captureMobileSession();
  useSessionStore.setState({ session, user, status: 'authenticated' });
  useTrainingStore.setState({ session, ready: true, activeWorkout: workout, localSaveState: 'saved', syncState: 'pending', error: null });
}
beforeEach(async () => {
  sent = [];
  adviceTransport = async () => json(hold);
  http = jest.fn(async (request: Request) => {
    if (request.url.endsWith('/auth/mobile/login')) return json({ accessToken: 'access-advice', refreshToken: 'refresh-advice' });
    if (request.url.endsWith('/users/me')) return json({ id: 'advice-user', email: 'advice-user@example.com', name: 'Usuario',
      trackCycle: false, biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], avgCycleLen: 28,
      avgPeriodLen: 5, createdAt: '2026-10-07T12:00:00Z' });
    sent.push(request);
    return adviceTransport(request);
  });
  globalThis.fetch = http as typeof fetch;
  jest.mocked(loadExercises).mockResolvedValue({ items: [exercise('Sentadilla'), exercise('Remo')], total: 2,
    page: 1, limit: 30, hasMore: false, source: 'cache', stale: false, notice: null, updatedAt: null });
  jest.mocked(loadRoutines).mockResolvedValue({ items: [], source: 'cache', stale: false, notice: null, updatedAt: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await signIn();
});
afterEach(async () => { await cleanup(); client.clear(); globalThis.fetch = originalFetch; });
const show = () => render(<QueryClientProvider client={client}><TrainScreen /></QueryClientProvider>);
async function consult() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Consultar recomendación' }));
}

it('consults on demand with the authenticated generated route and shows insufficient history without invented targets', async () => {
  await show();
  await screen.findByRole('button', { name: 'Agregar serie' });
  expect(sent).toHaveLength(0);
  await consult();
  expect(await screen.findByText(hold.rationale[0])).toBeTruthy();
  expect(screen.getByText('Mantener')).toBeTruthy();
  expect(screen.getByText('Sin carga numérica sugerida.')).toBeTruthy();
  expect(screen.queryByText(/Carga sugerida:/)).toBeNull();
  expect(sent.map(request => [request.url, request.headers.get('Authorization')])).toEqual([
    [`${API_BASE_URL}/adaptive/recommend/Sentadilla`, 'Bearer access-advice'],
  ]);
  expect(useTrainingStore.getState().activeWorkout).toEqual(workout);
});

it.each([['PROGRESS', 'Progresar', 52.5], ['DELOAD', 'Descargar', 45]] as const)(
  'shows server %s and rationale without applying its weight to local sets', async (action, label, weight) => {
    adviceTransport = async () => json({ ...hold, action, targetWeightKg: weight, targetReps: 8,
      confidence: 0.7, rationale: ['Motivo del servidor; contexto del ciclo estimado.'] });
    await show(); await consult();
    expect(await screen.findByText(label)).toBeTruthy();
    expect(screen.getByText(`Carga sugerida: ${weight} kg`)).toBeTruthy();
    expect(screen.getByText('Repeticiones sugeridas: 8')).toBeTruthy();
    expect(screen.getByText('Motivo del servidor; contexto del ciclo estimado.')).toBeTruthy();
    expect(useTrainingStore.getState().activeWorkout).toEqual(workout);
  });

it('shows loading and does not reuse advice when selection changes during an uncancellable response', async () => {
  const response = deferred<Response>();
  adviceTransport = async () => response.promise;
  await show(); await consult();
  await waitFor(() => expect(sent).toHaveLength(1));
  // Transport starts before Query's observer notification commits to the screen.
  expect(await screen.findByText('Consultando recomendación…')).toBeTruthy();
  const oldRequest = sent[0];
  await fireEvent.press(screen.getByRole('button', { name: 'Ver Remo' }));
  await waitFor(() => expect(oldRequest.signal.aborted).toBe(true));
  await act(async () => { response.resolve(json({ ...hold, rationale: ['Consejo obsoleto'] })); });
  expect(screen.queryByText('Consejo obsoleto')).toBeNull();
  expect(screen.queryByText('Consultando recomendación…')).toBeNull();
  adviceTransport = async () => json({ ...hold, exerciseId: 'Remo', rationale: ['Consejo de Remo'] });
  await consult();
  expect(await screen.findByText('Consejo de Remo')).toBeTruthy();
  expect(sent[1].url).toBe(`${API_BASE_URL}/adaptive/recommend/Remo`);
});

it.each(['network', 'api'] as const)('shows a recoverable %s failure instead of an empty or zero recommendation', async mode => {
  adviceTransport = async () => {
    if (mode === 'network') throw new TypeError('Sin conexión');
    return json({ code: 'SERVICE_UNAVAILABLE', message: 'Servidor no disponible.', retryable: true, requestId: 'advice-failure' }, 503);
  };
  await show(); await consult();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Mantener')).toBeNull();
  expect(screen.queryByText(/Carga sugerida:/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Agregar serie' })).toBeEnabled();
  adviceTransport = async () => json(hold);
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar recomendación' }));
  expect(await screen.findByText(hold.rationale[0])).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('does not show a previous successful recommendation after a failed manual update', async () => {
  await show(); await consult();
  await screen.findByText(hold.rationale[0]);
  adviceTransport = async () => { throw new TypeError('Sin conexión'); };
  await fireEvent.press(screen.getByRole('button', { name: 'Actualizar recomendación' }));
  await screen.findByRole('alert');
  expect(screen.queryByText(hold.rationale[0])).toBeNull();
  expect(screen.queryByText('Mantener')).toBeNull();
});

it('keeps a late recommendation out of a new login version of the same account', async () => {
  const response = deferred<Response>();
  adviceTransport = async () => response.promise;
  await show(); await consult();
  await waitFor(() => expect(sent).toHaveLength(1));
  await act(async () => { await signIn(); });
  await act(async () => { response.resolve(json({ ...hold, rationale: ['Consejo de la sesión anterior'] })); });
  expect(screen.queryByText('Consejo de la sesión anterior')).toBeNull();
  expect(screen.getByRole('button', { name: 'Consultar recomendación' })).toBeTruthy();
});

it('does not reuse successful advice for a different workout or consult a terminal workout', async () => {
  await show(); await consult();
  await screen.findByText(hold.rationale[0]);
  await act(async () => { useTrainingStore.setState({ activeWorkout: { ...workout, clientId: 'next-workout' } }); });
  expect(screen.queryByText(hold.rationale[0])).toBeNull();
  expect(screen.getByRole('button', { name: 'Consultar recomendación' })).toBeTruthy();
  await act(async () => { useTrainingStore.setState({ activeWorkout: { ...workout, status: 'COMPLETED' } }); });
  expect(screen.queryByRole('button', { name: 'Consultar recomendación' })).toBeNull();
  expect(sent).toHaveLength(1);
});

it.each(['different exercise', 'no content'] as const)('rejects a successful HTTP response with %s instead of showing fabricated advice', async mode => {
  adviceTransport = async () => mode === 'no content' ? new Response(null, { status: 204 })
    : json({ ...hold, exerciseId: 'Remo' });
  await show(); await consult();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Mantener')).toBeNull();
  expect(screen.getByRole('button', { name: 'Reintentar recomendación' })).toBeTruthy();
});
