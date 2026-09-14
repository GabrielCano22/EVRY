'use client';

import type { components } from '@evry/api-client';
import { evryApi, unwrapApiResponse } from './generated-api';

export type Readiness = components['schemas']['Readiness'];
export type ReadinessInput = components['schemas']['ReadinessInput'];

export function getLatestReadiness(signal?: AbortSignal): Promise<Readiness | null> {
  return unwrapApiResponse(evryApi.GET('/readiness/latest', { signal }));
}

export function saveReadiness(body: ReadinessInput): Promise<Readiness> {
  return unwrapApiResponse(evryApi.POST('/readiness/checkin', { body }));
}
