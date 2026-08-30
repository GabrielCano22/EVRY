import type { components } from '@evry/api-client';
import { apiClient, refreshMobileSession } from '../api/client';
import { cacheEntities, cachedEntities } from '../db/database';

export type Exercise = components['schemas']['Exercise'];
export type Routine = components['schemas']['Routine'];

export async function loadExercises(options: {
  search?: string;
  signal?: AbortSignal;
} = {}): Promise<Exercise[]> {
  const cached = await cachedEntities<Exercise>('exercise_cache');
  try {
    const query = {
      limit: 30,
      ...(options.search?.trim() ? { search: options.search.trim() } : {}),
    };
    let response = await apiClient.GET('/exercises', {
      params: { query },
      signal: options.signal,
    });
    if (response.response.status === 401 && await refreshMobileSession()) {
      response = await apiClient.GET('/exercises', {
        params: { query },
        signal: options.signal,
      });
    }
    const items = response.data?.items;
    if (items) {
      await cacheEntities('exercise_cache', items);
      return items;
    }
  } catch {
    // The local catalog remains usable while offline.
  }
  const search = options.search?.trim().toLocaleLowerCase('es');
  return search
    ? cached.filter((exercise) => exercise.name.toLocaleLowerCase('es').includes(search))
    : cached;
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
