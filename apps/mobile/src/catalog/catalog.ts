import type { components } from '@evry/api-client';
import { apiError, assertCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';
import { cacheEntities, cachedCollection, cachedExercisePage, replaceCachedRoutines } from '../db/database';

export type Exercise = components['schemas']['Exercise'];
export type Routine = components['schemas']['Routine'];
type ExercisePage = components['schemas']['ExercisePage'];

interface CacheInfo {
  source: 'server' | 'cache';
  stale: boolean;
  notice: string | null;
  updatedAt: string | null;
}
export type ExerciseResult = ExercisePage & CacheInfo;
export type RoutineResult = { items: Routine[] } & CacheInfo;

function temporaryFailure(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true;
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
  return typeof status === 'number' && (status >= 500 || status === 408 || status === 429);
}

function onlineError(response: { response: Response; error?: unknown }): void {
  if (!response.response.ok || response.error) {
    throw apiError(response.error, 'No se pudo consultar el servidor.', response.response.status);
  }
}

function missingCache(): Error {
  return apiError({ code: 'OFFLINE_CACHE_MISS', message: 'No hay conexión ni una copia local disponible. Conéctate y reintenta.' }, '');
}

function cachedInfo(updatedAt: string | null): CacheInfo {
  return {
    source: 'cache', stale: true, updatedAt,
    notice: 'Mostrando copia local: puede estar desactualizada. Reintenta al recuperar conexión.',
  };
}

function validItem(item: unknown): item is { id: string; name: string } {
  return typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string' &&
    'name' in item && typeof item.name === 'string';
}

export async function loadExercises(session: MobileSession, options: {
  search?: string;
  page?: number;
  signal?: AbortSignal;
} = {}): Promise<ExerciseResult> {
  assertCurrentMobileSession(session);
  const q = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  if (q.length > 80 || !Number.isInteger(page) || page < 1 || page > 10000) {
    throw apiError({ code: 'VALIDATION_ERROR', message: 'Revisa la búsqueda y la página solicitada.' }, '', 400);
  }
  const request = () => withMobileAuth((client) => client.GET('/exercises', {
    params: { query: { ...(q ? { q } : {}), page, limit: 30 } },
    signal: options.signal,
  }), session);
  let response: Awaited<ReturnType<typeof request>>;
  try {
    response = await request();
    onlineError(response);
  } catch (error) {
    assertCurrentMobileSession(session);
    if (options.signal?.aborted || !temporaryFailure(error)) throw error;
    const cached = await cachedExercisePage(session, q, page);
    assertCurrentMobileSession(session);
    if (!cached.available) throw missingCache();
    return { items: cached.items, page: cached.page, limit: cached.limit, total: cached.total, hasMore: cached.hasMore, ...cachedInfo(cached.updatedAt) };
  }
  const data = response.data;
  if (!data || !Array.isArray(data.items) || !data.items.every(validItem) ||
      data.items.length > 30 || data.page !== page || data.limit !== 30 ||
      !Number.isInteger(data.total) || data.total < 0 || typeof data.hasMore !== 'boolean') {
    throw apiError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió un catálogo incompatible. Reintenta.' }, '');
  }
  assertCurrentMobileSession(session);
  // Persistence errors are not network failures and must not become stale results.
  await cacheEntities(session, 'exercise_cache', data.items);
  assertCurrentMobileSession(session);
  return { ...data, source: 'server', stale: false, notice: null, updatedAt: new Date().toISOString() };
}

export async function loadRoutines(session: MobileSession, signal?: AbortSignal): Promise<RoutineResult> {
  assertCurrentMobileSession(session);
  const request = () => withMobileAuth((client) => client.GET('/routines', { signal }), session);
  let response: Awaited<ReturnType<typeof request>>;
  try {
    response = await request();
    onlineError(response);
  } catch (error) {
    assertCurrentMobileSession(session);
    if (signal?.aborted || !temporaryFailure(error)) throw error;
    const cached = await cachedCollection<Routine>(session, 'routine_cache');
    assertCurrentMobileSession(session);
    if (!cached.available) throw missingCache();
    return { items: cached.items, ...cachedInfo(cached.updatedAt) };
  }
  const items = response.data;
  if (!Array.isArray(items) || !items.every((item) => validItem(item) && Array.isArray(item.exercises))) {
    throw apiError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió rutinas incompatibles. Reintenta.' }, '');
  }
  assertCurrentMobileSession(session);
  await replaceCachedRoutines(session, items);
  assertCurrentMobileSession(session);
  return { items, source: 'server', stale: false, notice: null, updatedAt: new Date().toISOString() };
}
