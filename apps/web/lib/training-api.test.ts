import type { components } from '@evry/api-client';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import {
  addWorkoutSet,
  createRoutine,
  createWorkout,
  deleteRoutine,
  finishWorkout,
  getExercise,
  getRecommendation,
  getRoutine,
  getWorkout,
  listExercises,
  listRoutines,
  listWorkouts,
  startRoutine,
  trainingKeys,
  updateRoutine,
  type AdaptiveRecommendation,
  type CreateRoutineInput,
  type ExerciseDetail,
  type ExerciseListItem,
  type ExercisePage,
  type Routine,
  type UpdateRoutineInput,
  type Workout,
  type WorkoutSet,
} from './training-api';

interface CapturedRequest {
  body: string | null;
  method: string;
  url: string;
}

function captureJsonRequests(responseBody: unknown = { ok: true }, status = 200) {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    requests.push({
      body: request.body ? await request.text() : null,
      method: request.method,
      url: request.url,
    });
    return Response.json(responseBody, { status });
  }));
  return requests;
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('exports generated schema aliases for the training boundary', () => {
  expectTypeOf<ExerciseListItem>().toEqualTypeOf<components['schemas']['ExerciseListItemDto']>();
  expectTypeOf<ExercisePage>().toEqualTypeOf<components['schemas']['ExercisePageDto']>();
  expectTypeOf<ExerciseDetail>().toEqualTypeOf<components['schemas']['ExerciseDetail']>();
  expectTypeOf<Workout>().toEqualTypeOf<components['schemas']['Workout']>();
  expectTypeOf<WorkoutSet>().toEqualTypeOf<components['schemas']['WorkoutSet']>();
  expectTypeOf<Routine>().toEqualTypeOf<components['schemas']['Routine']>();
  expectTypeOf<CreateRoutineInput>().toEqualTypeOf<components['schemas']['CreateRoutineDto']>();
  expectTypeOf<UpdateRoutineInput>().toEqualTypeOf<components['schemas']['UpdateRoutineDto']>();
  expectTypeOf<AdaptiveRecommendation>().toEqualTypeOf<components['schemas']['AdaptiveRecommendation']>();
});

it('scopes every private training cache identity by account and all route arguments', () => {
  expect(trainingKeys.exerciseList('account-a')).toEqual([
    'training', 'account-a', 'exercises', 'list', { page: 1, limit: 30 },
  ]);
  expect(trainingKeys.exerciseList('account-b', {
    page: 2,
    limit: 15,
    muscleGroup: 'BACK',
    q: 'press & row',
    tag: 'power',
    equipment: 'CABLE',
    category: 'strength',
    target: 'lats',
  })).toEqual([
    'training',
    'account-b',
    'exercises',
    'list',
    {
      page: 2,
      limit: 15,
      muscleGroup: 'BACK',
      q: 'press & row',
      tag: 'power',
      equipment: 'CABLE',
      category: 'strength',
      target: 'lats',
    },
  ]);
  expect(trainingKeys.exerciseDetail('account-a', 'exercise/1')).toEqual([
    'training', 'account-a', 'exercises', 'detail', 'exercise/1',
  ]);
  expect(trainingKeys.workoutList('account-a', { take: 20, skip: 40 })).toEqual([
    'training', 'account-a', 'workouts', 'list', { take: 20, skip: 40 },
  ]);
  expect(trainingKeys.workoutDetail('account-a', 'workout/1')).toEqual([
    'training', 'account-a', 'workouts', 'detail', 'workout/1',
  ]);
  expect(trainingKeys.routineList('account-a')).toEqual([
    'training', 'account-a', 'routines', 'list',
  ]);
  expect(trainingKeys.routineDetail('account-a', 'routine/1')).toEqual([
    'training', 'account-a', 'routines', 'detail', 'routine/1',
  ]);
  expect(trainingKeys.recommendation('account-a', 'exercise/1')).toEqual([
    'training', 'account-a', 'recommendations', 'exercise/1',
  ]);
});

describe('generated training reads', () => {
  it('sends catalog defaults and every optional catalog filter through generated query params', async () => {
    const requests = captureJsonRequests({ items: [], page: 1, limit: 30, total: 0, hasMore: false });

    await listExercises();
    await listExercises({
      page: 2,
      limit: 15,
      muscleGroup: 'BACK',
      q: 'press & row',
      tag: 'power',
      equipment: 'CABLE',
      category: 'strength',
      target: 'lats',
    });

    expect(requests).toEqual([
      {
        body: null,
        method: 'GET',
        url: 'http://localhost:4000/api/v1/exercises?page=1&limit=30',
      },
      {
        body: null,
        method: 'GET',
        url: 'http://localhost:4000/api/v1/exercises?page=2&limit=15&muscleGroup=BACK&q=press%20%26%20row&tag=power&equipment=CABLE&category=strength&target=lats',
      },
    ]);
  });

  it('uses generated path and query parameters for every other read operation', async () => {
    const requests = captureJsonRequests({});

    await getExercise('exercise/press 1');
    await listWorkouts({ take: 20, skip: 40 });
    await getWorkout('workout/session 1');
    await getRecommendation('exercise/press 1');
    await listRoutines();
    await getRoutine('routine/upper 1');

    expect(requests).toEqual([
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/exercises/exercise%2Fpress%201' },
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/workouts?take=20&skip=40' },
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/workouts/workout%2Fsession%201' },
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/adaptive/recommend/exercise%2Fpress%201' },
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/routines' },
      { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/routines/routine%2Fupper%201' },
    ]);
  });
});

describe('generated training mutations', () => {
  it('sends the exact method, encoded route and body for every mutation operation', async () => {
    const requests = captureJsonRequests({ ok: true });

    await createWorkout({ name: 'Fuerza', notes: 'Tempo', routineId: 'routine/1' });
    await finishWorkout('workout/session 1', { notes: 'Completado' });
    await addWorkoutSet('workout/session 1', {
      exerciseId: 'exercise-1',
      order: 2,
      weightKg: 72.5,
      reps: 8,
      durationS: 45,
      rpe: 8,
      isWarmup: false,
      clientMutationId: 'mutation-1',
      techniqueStable: true,
    });
    await createRoutine({
      name: 'Torso',
      dayOfWeek: 2,
      notes: 'Control',
      exercises: [{
        exerciseId: 'exercise-1',
        order: 0,
        targetSets: 2,
        targetReps: 8,
        targetWeightKg: 70,
        seriesPlan: [{ reps: 8, weightKg: 70 }, { reps: 6, weightKg: 75 }],
        notes: 'Pausa',
      }],
    });
    await updateRoutine('routine/upper 1', {
      name: 'Torso B',
      dayOfWeek: null,
      notes: 'Actualizada',
      exercises: [],
    });
    await deleteRoutine('routine/upper 1');
    await startRoutine('routine/upper 1');

    expect(requests).toEqual([
      {
        body: '{"name":"Fuerza","notes":"Tempo","routineId":"routine/1"}',
        method: 'POST',
        url: 'http://localhost:4000/api/v1/workouts',
      },
      {
        body: '{"notes":"Completado"}',
        method: 'POST',
        url: 'http://localhost:4000/api/v1/workouts/workout%2Fsession%201/finish',
      },
      {
        body: '{"exerciseId":"exercise-1","order":2,"weightKg":72.5,"reps":8,"durationS":45,"rpe":8,"isWarmup":false,"clientMutationId":"mutation-1","techniqueStable":true}',
        method: 'POST',
        url: 'http://localhost:4000/api/v1/workouts/workout%2Fsession%201/sets',
      },
      {
        body: '{"name":"Torso","dayOfWeek":2,"notes":"Control","exercises":[{"exerciseId":"exercise-1","order":0,"targetSets":2,"targetReps":8,"targetWeightKg":70,"seriesPlan":[{"reps":8,"weightKg":70},{"reps":6,"weightKg":75}],"notes":"Pausa"}]}',
        method: 'POST',
        url: 'http://localhost:4000/api/v1/routines',
      },
      {
        body: '{"name":"Torso B","dayOfWeek":null,"notes":"Actualizada","exercises":[]}',
        method: 'PATCH',
        url: 'http://localhost:4000/api/v1/routines/routine%2Fupper%201',
      },
      {
        body: null,
        method: 'DELETE',
        url: 'http://localhost:4000/api/v1/routines/routine%2Fupper%201',
      },
      {
        body: null,
        method: 'POST',
        url: 'http://localhost:4000/api/v1/routines/routine%2Fupper%201/start',
      },
    ]);
  });

  it('normalizes a structured workout conflict instead of returning empty data', async () => {
    captureJsonRequests({
      code: 'ACTIVE_WORKOUT_CONFLICT',
      message: 'Ya existe una sesión activa.',
      retryable: false,
      requestId: 'request-conflict_409',
    }, 409);

    const result = createWorkout({ name: 'Fuerza' });

    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 409,
      code: 'ACTIVE_WORKOUT_CONFLICT',
      retryable: false,
      requestId: 'request-conflict_409',
    });
  });
});
