// Explicit guarded integration, not a device test. A missing search argument,
// page reset or cursor, or replacing accumulated history with the latest page,
// must fail these assertions. API responses and UI components remain real.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { CurrentUser, MobileSession } from '../api/client';

const mockSecure = new Map<string, string>();
let mockSQLite: ReturnType<typeof import('../testing/sqlite-native')['createSQLiteBridge']>;
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: (name: string) => mockSQLite.openDatabaseAsync(name) }));
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'synthetic-device',
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockSecure.set(key, value); },
  deleteItemAsync: async (key: string) => { mockSecure.delete(key); },
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

const { createRequire } = jest.requireActual('node:module');
const { resolve } = jest.requireActual('node:path');
const { randomUUID } = jest.requireActual('node:crypto');
const backendRequire = createRequire(resolve(process.env.EVRY_BACKEND_ROOT!, 'package.json'));
const { Client } = backendRequire('pg');
const postgres = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
const userId: string = randomUUID();
const prefix = `progress-${randomUUID().slice(0, 8)}`;
const exerciseIds: string[] = Array.from({ length: 33 }, () => randomUUID());
let session: MobileSession;
let signedInUser: CurrentUser;
let Panel: typeof import('./ExerciseProgressPanel')['ExerciseProgressPanel'];
const queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
// Desktop native transformations/real multi-request fixture journeys are not
// release startup or API latency measurements. CI and other OS stay unchanged.
const localWindows = process.platform === 'win32' && !process.env.CI;
const fixturePreparationTimeout = localWindows ? 30000 : 5000;
const fixtureJourneyTimeout = localWindows ? 15000 : 5000;

beforeAll(async () => {
  // Coherent real HTTP constructors must precede generated client construction.
  const transport = jest.requireActual('node-fetch');
  global.Request = transport.Request;
  global.Response = transport.Response;
  global.Headers = transport.Headers;
  global.fetch = transport;
  mockSQLite = jest.requireActual('../testing/sqlite-native').createSQLiteBridge();
  const api: typeof import('../api/client') = jest.requireActual('../api/client');
  Panel = jest.requireActual('./ExerciseProgressPanel').ExerciseProgressPanel;
  const password = 'synthetic-progress-contract-password';
  const hash = await backendRequire('bcrypt').hash(password, 10);
  await postgres.connect();
  await postgres.query('INSERT INTO "User" (id,email,"passwordHash",name,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
    [userId, `${prefix}@example.test`, hash, 'Synthetic progress contract']);
  for (const [index, id] of exerciseIds.entries()) {
    await postgres.query('INSERT INTO "Exercise" (id,name,"muscleGroup","isCustom","ownerId") VALUES ($1,$2,\'CHEST\',true,$3)',
      [id, `${prefix} exercise ${String(index + 1).padStart(2, '0')}`, userId]);
  }
  // Literal source data: 41 x (60kg x 10reps) = 24600kg. Distinct historical
  // dates make descending cursor order deterministic without clock assumptions.
  for (let index = 1; index <= 41; index++) {
    const workoutId = randomUUID();
    const endedAt = new Date(Date.UTC(2020, 0, index, 15));
    await postgres.query('INSERT INTO "Workout" (id,"userId",name,"startedAt","endedAt",status,"updatedAt") VALUES ($1,$2,$3,$4,$4,\'COMPLETED\',NOW())',
      [workoutId, userId, `Synthetic progress session ${String(index).padStart(3, '0')}`, endedAt]);
    await postgres.query('INSERT INTO "WorkoutSet" (id,"workoutId","exerciseId","order","weightKg",reps,"completedAt","updatedAt") VALUES ($1,$2,$3,0,60,10,$4,NOW())',
      [randomUUID(), workoutId, exerciseIds[0], endedAt]);
  }
  await api.loginMobile(`${prefix}@example.test`, password);
  signedInUser = await api.currentUserWithRefresh();
  expect(signedInUser.id).toBe(userId);
  session = api.captureMobileSession();
}, fixturePreparationTimeout);

afterAll(async () => {
  queries.clear();
  try {
    // Only exact owned fixtures; User cascades sessions/sets, but exercises use
    // SET NULL ownership and therefore require their own exact-ID cleanup.
    await postgres.query('DELETE FROM "User" WHERE id=$1', [userId]);
    await postgres.query('DELETE FROM "Exercise" WHERE id=ANY($1::text[])', [exerciseIds]);
  } finally { await postgres.end(); }
});

it('searches owned exercises, resets catalog pages and accumulates all real history cursors', async () => {
  const view = await render(<QueryClientProvider client={queries}><Panel session={session} period="all" /></QueryClientProvider>);
  await fireEvent.changeText(view.getByLabelText('Buscar ejercicio para ver progreso'), prefix);
  await waitFor(() => expect(view.getAllByRole('button', { name: new RegExp(`${prefix} exercise`) })).toHaveLength(30));
  expect(view.queryByRole('button', { name: `${prefix} exercise 31` })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Página siguiente' }));
  await waitFor(() => expect(view.getAllByRole('button', { name: new RegExp(`${prefix} exercise`) })).toHaveLength(3));
  expect(view.getByRole('button', { name: `${prefix} exercise 33` })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Página siguiente' })).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Buscar ejercicio para ver progreso'), `${prefix} exercise 01`);
  await waitFor(() => expect(view.getByRole('button', { name: `${prefix} exercise 01` })).toBeTruthy());
  expect(view.queryByRole('button', { name: 'Página anterior' })).toBeNull();
  await fireEvent.changeText(view.getByLabelText('Buscar ejercicio para ver progreso'), `${prefix} absent`);
  await waitFor(() => expect(view.getByText('No hay ejercicios para esta búsqueda.')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText('Buscar ejercicio para ver progreso'), `${prefix} exercise 01`);
  await waitFor(() => expect(view.getByRole('button', { name: `${prefix} exercise 01` })).toBeTruthy());
  await fireEvent.press(view.getByRole('button', { name: `${prefix} exercise 01` }));
  await waitFor(() => expect(view.getByText('41 sesiones · 41 series · 24600 kg de volumen')).toBeTruthy());
  expect(view.getByText('Mejor peso: 60 kg')).toBeTruthy();
  expect(view.getByText('Sin periodo anterior comparable.')).toBeTruthy();
  expect(view.getAllByText(/^Synthetic progress session/)).toHaveLength(20);
  expect(view.getByText(/^Synthetic progress session 041/)).toBeTruthy();
  expect(view.queryByText(/^Synthetic progress session 021/)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Cargar más sesiones' }));
  await waitFor(() => expect(view.getAllByText(/^Synthetic progress session/)).toHaveLength(40));
  expect(view.getByText(/^Synthetic progress session 021/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Cargar más sesiones' }));
  await waitFor(() => expect(view.getAllByText(/^Synthetic progress session/)).toHaveLength(41));
  const names = view.getAllByText(/^Synthetic progress session/).map(item => String(item.props.children[0]));
  expect(new Set(names).size).toBe(41);
  expect(view.getByText(/^Synthetic progress session 001/)).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Cargar más sesiones' })).toBeNull();
  await view.unmount();
}, fixtureJourneyTimeout);

it('changes both real overview and exercise history with the complete progress screen period', async () => {
  const { useSessionStore }: typeof import('../auth/session-store') = jest.requireActual('../auth/session-store');
  const { AccountQueryProvider }: typeof import('../auth/AccountQueryProvider') = jest.requireActual('../auth/AccountQueryProvider');
  const ProgressScreen: typeof import('../../app/(tabs)/progress')['default'] = jest.requireActual('../../app/(tabs)/progress').default;
  // Use the actual authenticated response and captured token generation, not a
  // synthetic user/session or a mocked route/query provider.
  useSessionStore.setState({ status: 'authenticated', user: signedInUser, session, offline: false, error: null });
  const view = await render(<AccountQueryProvider session={session}><ProgressScreen /></AccountQueryProvider>);
  await view.findByText('Aún no hay series útiles en este periodo.');
  expect(within(view.getByText('Sesiones').parent!).getByText('0')).toBeTruthy();
  expect(view.getByText('0 sesiones')).toBeTruthy();
  expect(view.getByText('0 kg de volumen')).toBeTruthy();
  await fireEvent.press(view.getByRole('tab', { name: 'Todo' }));
  await view.findByText('24.600 kg');
  expect(within(view.getByText('Sesiones').parent!).getByText('41')).toBeTruthy();
  expect(within(view.getByText('Días activos').parent!).getByText('41')).toBeTruthy();
  expect(view.getByText('41 series · 100%')).toBeTruthy();
  expect(view.getByText('CHEST')).toBeTruthy();
  expect(view.getByText('El periodo completo no tiene una ventana anterior comparable.')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('Buscar ejercicio para ver progreso'), `${prefix} exercise 01`);
  await waitFor(() => expect(view.getByRole('button', { name: `${prefix} exercise 01` })).toBeTruthy());
  await fireEvent.press(view.getByRole('button', { name: `${prefix} exercise 01` }));
  await view.findByText('41 sesiones · 41 series · 24600 kg de volumen');
  await fireEvent.press(view.getByRole('tab', { name: '30 días' }));
  await view.findByText('Sin sesiones registradas en este periodo.');
  expect(view.getByText('Aún no hay series útiles en este periodo.')).toBeTruthy();
  expect(view.getByText('0 sesiones · 0 series · 0 kg de volumen')).toBeTruthy();
  expect(view.queryByText('41 sesiones · 41 series · 24600 kg de volumen')).toBeNull();
  await fireEvent.press(view.getByRole('tab', { name: 'Todo' }));
  await view.findByText('41 sesiones · 41 series · 24600 kg de volumen');
  expect(view.getByText('24.600 kg')).toBeTruthy();
  expect(view.getAllByText(/^Synthetic progress session/)).toHaveLength(20);
  expect(view.queryByRole('alert')).toBeNull();
  await view.unmount();
  useSessionStore.setState({ status: 'anonymous', user: null, session: null });
}, fixtureJourneyTimeout);
