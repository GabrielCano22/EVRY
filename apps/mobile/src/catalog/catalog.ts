import type { components } from '@evry/api-client';
import { assertCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';
import { cacheEntities, cachedEntities } from '../db/database';

export type Exercise = components['schemas']['Exercise'];
export type Routine = components['schemas']['Routine'];

export async function loadExercises(session: MobileSession, options: {
  search?: string;
  signal?: AbortSignal;
} = {}): Promise<Exercise[]> {
  assertCurrentMobileSession(session);
  const cached = await cachedEntities<Exercise>(session, 'exercise_cache');
  assertCurrentMobileSession(session);
  try {
    const query = {
      limit: 30,
      ...(options.search?.trim() ? { search: options.search.trim() } : {}),
    };
    const response = await withMobileAuth((client) => client.GET('/exercises', {
      params: { query },
      signal: options.signal,
    }), session);
    const items = response.data?.items;
    if (items) {
      assertCurrentMobileSession(session);
      await cacheEntities(session, 'exercise_cache', items);
      assertCurrentMobileSession(session);
      return items;
    }
  } catch {
    assertCurrentMobileSession(session);
    // The local catalog remains usable while offline.
  }
  const search = options.search?.trim().toLocaleLowerCase('es');
  return search
    ? cached.filter((exercise) => exercise.name.toLocaleLowerCase('es').includes(search))
    : cached;
}

export async function loadRoutines(session: MobileSession): Promise<Routine[]> {
  assertCurrentMobileSession(session);
  const cached = await cachedEntities<Routine>(session, 'routine_cache');
  assertCurrentMobileSession(session);
  try {
    const response = await withMobileAuth((client) => client.GET('/routines'), session);
    if (response.data?.length) {
      assertCurrentMobileSession(session);
      await cacheEntities(session, 'routine_cache', response.data);
      assertCurrentMobileSession(session);
      return response.data;
    }
  } catch {
    assertCurrentMobileSession(session);
    // Cached routines are the offline source of truth until reconnecting.
  }
  return cached;
}
