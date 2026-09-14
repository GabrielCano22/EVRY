'use client';

import type { components, operations } from '@evry/api-client';
import { evryApi, unwrapApiResponse } from './generated-api';

export type ProgressOverview = components['schemas']['ProgressOverview'];
export type ProgressActivity = components['schemas']['ProgressActivity'];
export type ProgressActivitySession = components['schemas']['ProgressActivitySession'];
export type ExerciseProgress = components['schemas']['ExerciseProgress'];
export type ProgressPeriod = components['schemas']['ProgressPeriodWindow']['key'];
export type ProgressActivityRange = NonNullable<
  operations['ProgressController_activity']['parameters']['query']
>;
export type ExerciseProgressFilters = NonNullable<
  operations['ProgressController_exerciseProgress[0]']['parameters']['query']
>;

export function getProgressOverview(
  period: ProgressPeriod = '30d',
  signal?: AbortSignal,
): Promise<ProgressOverview> {
  return unwrapApiResponse(evryApi.GET('/progress/overview', {
    params: { query: { period } },
    signal,
  }));
}

export function getProgressActivity(
  range: ProgressActivityRange,
  signal?: AbortSignal,
): Promise<ProgressActivity> {
  return unwrapApiResponse(evryApi.GET('/progress/activity', {
    params: { query: range },
    signal,
  }));
}

export function getExerciseProgress(
  exerciseId: string,
  filters: ExerciseProgressFilters = {},
  signal?: AbortSignal,
): Promise<ExerciseProgress> {
  return unwrapApiResponse(evryApi.GET('/progress/exercises/{id}', {
    params: { path: { id: exerciseId }, query: filters },
    signal,
  }));
}
