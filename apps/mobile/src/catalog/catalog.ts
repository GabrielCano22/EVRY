import type { components } from '@evry/api-client';
import { apiClient, refreshMobileSession } from '../api/client';
import { cacheEntities, cachedEntities } from '../db/database';

export type Exercise = components['schemas']['Exercise'];
export type Routine = components['schemas']['Routine'];

export async function loadExercises(): Promise<Exercise[]> {
  const cached = await cachedEntities<Exercise>('exercise_cache');
  try {
    let response = await apiClient.GET('/exercises', { params: { query: { limit: 30 } } });
    if (response.response.status === 401 && await refreshMobileSession()) {
      response = await apiClient.GET('/exercises', { params: { query: { limit: 30 } } });
    }
    const items = response.data?.items;
    if (items?.length) {
      await cacheEntities('exercise_cache', items);
      return items;
    }
  } catch {
    // The local catalog remains usable while offline.
  }
  return cached;
}

export async function loadRoutines(): Promise<Routine[]> {
  const cached = await cachedEntities<Routine>('routine_cache');
  try {
    let response = await apiClient.GET('/routines');
    if (response.response.status === 401 && await refreshMobileSession()) {
      response = await apiClient.GET('/routines');
    }
    if (response.data?.length) {
      await cacheEntities('routine_cache', response.data);
      return response.data;
    }
  } catch {
    // Cached routines are the offline source of truth until reconnecting.
  }
  return cached;
}
