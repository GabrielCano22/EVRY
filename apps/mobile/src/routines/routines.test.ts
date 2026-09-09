import type * as Api from '../api/client';
import type { Routine } from '../catalog/catalog';

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    deleteItemAsync: async (key: string) => { values.delete(key); },
  };
});

let api: typeof Api;
let routines: typeof import('./routines');
let session: Api.MobileSession;
let http: jest.Mock<Promise<Response>, [Request]>;
const originalFetch = globalThis.fetch;

const user: Api.CurrentUser = {
  id: 'user-1', name: 'Ana', email: 'ana@example.com', biologicalSex: 'PREFER_NOT_SAY',
  birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5,
  createdAt: '2026-09-09T10:00:00.000Z',
};
const routine: Routine = {
  id: 'routine-1', userId: 'user-1', name: 'Piernas', dayOfWeek: 2, notes: 'Fuerza',
  createdAt: '2026-09-09T10:00:00.000Z', updatedAt: '2026-09-09T10:00:00.000Z',
  exercises: [{
    id: 'routine-exercise-1', routineId: 'routine-1', exerciseId: 'exercise-1', order: 0,
    targetSets: 3, targetReps: 8, targetWeightKg: 60, seriesPlan: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }], notes: 'Control',
    exercise: { id: 'exercise-1', name: 'Sentadilla', category: null, imagePath: null, gifPath: null, target: null, bodyPart: null, secondaryMuscles: [], equipment: 'BARBELL', equipmentLabel: null, isCustom: false, ownerId: null, isCompound: true, tags: [], description: null, mediaId: null, attribution: null, sourceId: null, muscleGroup: 'QUADS', instructions: null, instructionSteps: null, createdAt: '2026-09-09T10:00:00.000Z' },
  }],
};
const input = {
  name: 'Piernas', dayOfWeek: 2, notes: 'Fuerza',
  exercises: [{ exerciseId: 'exercise-1', order: 0, targetSets: 3, targetReps: 8, targetWeightKg: 60, seriesPlan: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }], notes: 'Control' }],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(async () => {
  http = jest.fn(async (request: Request) => request.url.endsWith('/login')
    ? json({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    : json(user));
  globalThis.fetch = http as typeof fetch;
  jest.isolateModules(() => {
    api = jest.requireActual('../api/client');
    routines = jest.requireActual('./routines');
  });
  await api.loginMobile('ana@example.com', 'password');
  await api.currentUserWithRefresh();
  session = api.captureMobileSession();
  http.mockClear();
});
afterEach(() => { globalThis.fetch = originalFetch; });

it('creates, updates, and deletes a routine through the typed authenticated operations', async () => {
  http.mockResolvedValueOnce(json(routine, 201)).mockResolvedValueOnce(json({ ...routine, name: 'Piernas pesadas' }))
    .mockResolvedValueOnce(json({ ok: true }));

  await expect(routines.createRoutine(session, input)).resolves.toEqual(routine);
  await expect(routines.updateRoutine(session, 'routine-1', { name: 'Piernas pesadas' })).resolves.toMatchObject({ name: 'Piernas pesadas' });
  await expect(routines.deleteRoutine(session, 'routine-1')).resolves.toBeUndefined();

  const [create, update, remove] = http.mock.calls.map(([request]) => request);
  expect([create.method, update.method, remove.method]).toEqual(['POST', 'PATCH', 'DELETE']);
  expect([new URL(create.url).pathname, new URL(update.url).pathname, new URL(remove.url).pathname])
    .toEqual(['/api/v1/routines', '/api/v1/routines/routine-1', '/api/v1/routines/routine-1']);
  expect(await create.json()).toEqual(input);
});

it('preserves backend API errors and rejects incompatible mutation responses', async () => {
  http.mockResolvedValueOnce(json({ code: 'VALIDATION_ERROR', message: 'El nombre ya existe', retryable: false, requestId: 'req-1' }, 400));
  await expect(routines.createRoutine(session, input)).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400, message: 'El nombre ya existe' });

  http.mockResolvedValueOnce(json({ ...routine, name: 3 }));
  await expect(routines.updateRoutine(session, 'routine-1', { name: 'Piernas' })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

  http.mockResolvedValueOnce(json({ ok: false }));
  await expect(routines.deleteRoutine(session, 'routine-1')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

it('rejects malformed per-set plans and incomplete nested exercises from a successful response', async () => {
  http.mockResolvedValueOnce(json({ ...routine, exercises: [{ ...routine.exercises[0], seriesPlan: 'invalid' }] }, 201));
  await expect(routines.createRoutine(session, input)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

  const { instructions: _instructions, ...incompleteExercise } = routine.exercises[0].exercise;
  http.mockResolvedValueOnce(json({ ...routine, exercises: [{ ...routine.exercises[0], exercise: incompleteExercise }] }, 201));
  await expect(routines.createRoutine(session, input)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

it('rejects a mutation when the captured mobile session changes during the request', async () => {
  let resolveResponse: ((response: Response) => void) | undefined;
  http.mockImplementation(() => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
  const mutation = routines.createRoutine(session, input);
  const rejected = expect(mutation).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  await api.clearMobileSession();
  resolveResponse!(json(routine, 201));
  await rejected;
});
