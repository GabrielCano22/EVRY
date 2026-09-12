'use client';

import type { components, operations } from '@evry/api-client';
import { evryApi, unwrapApiResponse } from './generated-api';

export type ExerciseListItem = components['schemas']['ExerciseListItemDto'];
export type ExercisePage = components['schemas']['ExercisePageDto'];
export type ExerciseDetail = components['schemas']['ExerciseDetail'];
export type Workout = components['schemas']['Workout'];
export type WorkoutSet = components['schemas']['WorkoutSet'];
export type Routine = components['schemas']['Routine'];
export type CreateRoutineInput = components['schemas']['CreateRoutineDto'];
export type UpdateRoutineInput = components['schemas']['UpdateRoutineDto'];
export type AdaptiveRecommendation = components['schemas']['AdaptiveRecommendation'];

export type ExerciseListFilters = NonNullable<
  operations['ExercisesController_list']['parameters']['query']
>;
export type WorkoutListFilters = NonNullable<
  operations['WorkoutsController_list']['parameters']['query']
>;
export type CreateWorkoutInput = components['schemas']['CreateWorkoutInput'];
export type FinishWorkoutInput = components['schemas']['FinishWorkoutInput'];
export type CreateWorkoutSetInput = components['schemas']['CreateSetInput'];
export type DeleteRoutineResult = components['schemas']['Ok'];

function exerciseFilters(filters: ExerciseListFilters = {}): ExerciseListFilters {
  const { page = 1, limit = 30, ...optionalFilters } = filters;
  return { page, limit, ...optionalFilters };
}

export const trainingKeys = {
  all: (accountId: string) => ['training', accountId] as const,
  exercises: (accountId: string) => [...trainingKeys.all(accountId), 'exercises'] as const,
  exerciseList: (accountId: string, filters: ExerciseListFilters = {}) => [
    ...trainingKeys.exercises(accountId),
    'list',
    exerciseFilters(filters),
  ] as const,
  exerciseDetail: (accountId: string, exerciseId: string) => [
    ...trainingKeys.exercises(accountId),
    'detail',
    exerciseId,
  ] as const,
  workouts: (accountId: string) => [...trainingKeys.all(accountId), 'workouts'] as const,
  workoutList: (accountId: string, filters: WorkoutListFilters = {}) => [
    ...trainingKeys.workouts(accountId),
    'list',
    filters,
  ] as const,
  workoutDetail: (accountId: string, workoutId: string) => [
    ...trainingKeys.workouts(accountId),
    'detail',
    workoutId,
  ] as const,
  routines: (accountId: string) => [...trainingKeys.all(accountId), 'routines'] as const,
  routineList: (accountId: string) => [...trainingKeys.routines(accountId), 'list'] as const,
  routineDetail: (accountId: string, routineId: string) => [
    ...trainingKeys.routines(accountId),
    'detail',
    routineId,
  ] as const,
  recommendation: (accountId: string, exerciseId: string) => [
    ...trainingKeys.all(accountId),
    'recommendations',
    exerciseId,
  ] as const,
};

export function listExercises(
  filters: ExerciseListFilters = {},
  signal?: AbortSignal,
): Promise<ExercisePage> {
  return unwrapApiResponse(evryApi.GET('/exercises', {
    params: { query: exerciseFilters(filters) },
    signal,
  }));
}

export function getExercise(exerciseId: string, signal?: AbortSignal): Promise<ExerciseDetail> {
  return unwrapApiResponse(evryApi.GET('/exercises/{id}', {
    params: { path: { id: exerciseId } },
    signal,
  }));
}

export function listWorkouts(
  filters: WorkoutListFilters = {},
  signal?: AbortSignal,
): Promise<Workout[]> {
  return unwrapApiResponse(evryApi.GET('/workouts', {
    params: { query: filters },
    signal,
  }));
}

export function getWorkout(workoutId: string, signal?: AbortSignal): Promise<Workout> {
  return unwrapApiResponse(evryApi.GET('/workouts/{id}', {
    params: { path: { id: workoutId } },
    signal,
  }));
}

export function createWorkout(body: CreateWorkoutInput): Promise<Workout> {
  return unwrapApiResponse(evryApi.POST('/workouts', { body }));
}

export function finishWorkout(
  workoutId: string,
  body: FinishWorkoutInput = {},
): Promise<Workout> {
  return unwrapApiResponse(evryApi.POST('/workouts/{id}/finish', {
    params: { path: { id: workoutId } },
    body,
  }));
}

export function addWorkoutSet(
  workoutId: string,
  body: CreateWorkoutSetInput,
): Promise<WorkoutSet> {
  return unwrapApiResponse(evryApi.POST('/workouts/{id}/sets', {
    params: { path: { id: workoutId } },
    body,
  }));
}

export function getRecommendation(
  exerciseId: string,
  signal?: AbortSignal,
): Promise<AdaptiveRecommendation> {
  return unwrapApiResponse(evryApi.GET('/adaptive/recommend/{exerciseId}', {
    params: { path: { exerciseId } },
    signal,
  }));
}

export function listRoutines(signal?: AbortSignal): Promise<Routine[]> {
  return unwrapApiResponse(evryApi.GET('/routines', { signal }));
}

export function getRoutine(routineId: string, signal?: AbortSignal): Promise<Routine> {
  return unwrapApiResponse(evryApi.GET('/routines/{id}', {
    params: { path: { id: routineId } },
    signal,
  }));
}

export function createRoutine(body: CreateRoutineInput): Promise<Routine> {
  return unwrapApiResponse(evryApi.POST('/routines', { body }));
}

export function updateRoutine(routineId: string, body: UpdateRoutineInput): Promise<Routine> {
  return unwrapApiResponse(evryApi.PATCH('/routines/{id}', {
    params: { path: { id: routineId } },
    body,
  }));
}

export function deleteRoutine(routineId: string): Promise<DeleteRoutineResult> {
  return unwrapApiResponse(evryApi.DELETE('/routines/{id}', {
    params: { path: { id: routineId } },
  }));
}

export function startRoutine(routineId: string): Promise<Workout> {
  return unwrapApiResponse(evryApi.POST('/routines/{id}/start', {
    params: { path: { id: routineId } },
  }));
}
