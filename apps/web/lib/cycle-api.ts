'use client';

import type { components, operations } from '@evry/api-client';
import { evryApi, unwrapApiResponse } from './generated-api';

export type CyclePhaseInfo = components['schemas']['CyclePhaseInfo'];
export type CycleEntryInput = components['schemas']['CycleEntryInput'];
export type CycleEntry = components['schemas']['CycleEntry'];
export type CycleCalendar = components['schemas']['CycleCalendar'];
export type DeleteCycleEntryResult = components['schemas']['DeleteCycleEntryResult'];
export type CycleEntryFilters = NonNullable<
  operations['CycleController_list']['parameters']['query']
>;
export type CycleCalendarRange = NonNullable<
  operations['CycleController_calendar']['parameters']['query']
>;

export function listCycleEntries(
  filters: CycleEntryFilters = {},
  signal?: AbortSignal,
): Promise<CycleEntry[]> {
  return unwrapApiResponse(evryApi.GET('/cycle/entries', {
    params: { query: filters },
    signal,
  }));
}

export function getCycleToday(signal?: AbortSignal): Promise<CyclePhaseInfo | null> {
  return unwrapApiResponse(evryApi.GET('/cycle/today', { signal }));
}

export function getCycleCalendar(
  range: CycleCalendarRange,
  signal?: AbortSignal,
): Promise<CycleCalendar> {
  return unwrapApiResponse(evryApi.GET('/cycle/calendar', {
    params: { query: range },
    signal,
  }));
}

export function upsertCycleEntry(body: CycleEntryInput): Promise<CycleEntry> {
  return unwrapApiResponse(evryApi.POST('/cycle/entries', { body }));
}

export function deleteCycleEntry(entryId: string): Promise<DeleteCycleEntryResult> {
  return unwrapApiResponse(evryApi.DELETE('/cycle/entries/{id}', {
    params: { path: { id: entryId } },
  }));
}
