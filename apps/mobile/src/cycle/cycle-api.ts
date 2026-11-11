import { withMobileAuth, type MobileSession } from '../api/client';
import type { CycleEntry, CycleInput } from './CycleEntryForm';

/** Inclusive civil-date window; the API rejects ranges longer than a year. */
export interface CycleRange {
  from: string;
  to: string;
}

export async function loadEntries(
  session: MobileSession,
  options: { signal?: AbortSignal; range?: CycleRange } = {},
): Promise<CycleEntry[]> {
  const response = await withMobileAuth((client) => client.GET('/cycle/entries', {
    params: options.range ? { query: { from: options.range.from, to: options.range.to } } : {},
    signal: options.signal,
  }), session);
  if (!response.data || response.error) throw new Error('No se pudo cargar el ciclo.');
  return response.data;
}

export async function saveEntry(session: MobileSession, body: CycleInput): Promise<CycleEntry> {
  const request = { body };
  const response = await withMobileAuth((client) => client.POST('/cycle/entries', request), session);
  if (!response.data || response.error) throw new Error(response.error?.message ?? 'No se pudo guardar el registro.');
  return response.data;
}

export async function removeEntry(session: MobileSession, id: string): Promise<void> {
  const response = await withMobileAuth(
    (client) => client.DELETE('/cycle/entries/{id}', { params: { path: { id } } }),
    session,
  );
  if (response.error) throw new Error(response.error.message ?? 'No se pudo eliminar el registro.');
}
