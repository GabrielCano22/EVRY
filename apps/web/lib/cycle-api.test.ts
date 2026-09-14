import type { components } from '@evry/api-client';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import {
  deleteCycleEntry,
  getCycleCalendar,
  getCycleToday,
  listCycleEntries,
  upsertCycleEntry,
  type CycleCalendar,
  type CycleEntry,
  type CycleEntryInput,
  type CyclePhaseInfo,
  type DeleteCycleEntryResult,
} from './cycle-api';

interface CapturedRequest {
  body: string | null;
  method: string;
  url: string;
}

function captureJsonRequests(responseBody: unknown = {}) {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    requests.push({
      body: request.body ? await request.text() : null,
      method: request.method,
      url: request.url,
    });
    return Response.json(responseBody);
  }));
  return requests;
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('exports generated cycle schema aliases', () => {
  expectTypeOf<CyclePhaseInfo>().toEqualTypeOf<components['schemas']['CyclePhaseInfo']>();
  expectTypeOf<CycleEntryInput>().toEqualTypeOf<components['schemas']['CycleEntryInput']>();
  expectTypeOf<CycleEntry>().toEqualTypeOf<components['schemas']['CycleEntry']>();
  expectTypeOf<CycleCalendar>().toEqualTypeOf<components['schemas']['CycleCalendar']>();
  expectTypeOf<DeleteCycleEntryResult>().toEqualTypeOf<components['schemas']['DeleteCycleEntryResult']>();
});

it('sends every cycle read and mutation through generated routes', async () => {
  const requests = captureJsonRequests();

  await listCycleEntries({ from: '2026-08-01', to: '2026-08-31' });
  await getCycleToday();
  await getCycleCalendar({ from: '2026-08-01', to: '2026-08-31' });
  await upsertCycleEntry({
    date: '2026-08-14',
    previousDate: '2026-08-13',
    flow: 'LIGHT',
    symptoms: ['fatiga'],
    energy: null,
    mood: 4,
    notes: 'Mejor al final del día',
    isPeriodStart: true,
  });
  await deleteCycleEntry('entry/with space');

  expect(requests).toEqual([
    { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/cycle/entries?from=2026-08-01&to=2026-08-31' },
    { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/cycle/today' },
    { body: null, method: 'GET', url: 'http://localhost:4000/api/v1/cycle/calendar?from=2026-08-01&to=2026-08-31' },
    {
      body: '{"date":"2026-08-14","previousDate":"2026-08-13","flow":"LIGHT","symptoms":["fatiga"],"energy":null,"mood":4,"notes":"Mejor al final del día","isPeriodStart":true}',
      method: 'POST',
      url: 'http://localhost:4000/api/v1/cycle/entries',
    },
    { body: null, method: 'DELETE', url: 'http://localhost:4000/api/v1/cycle/entries/entry%2Fwith%20space' },
  ]);
});

it('propagates structured cycle conflicts instead of treating them as empty data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'CYCLE_DATE_CONFLICT',
    message: 'Ya existe un registro en la fecha de destino.',
    retryable: false,
    requestId: 'request-cycle_409',
  }, { status: 409 })));

  const result = upsertCycleEntry({ date: '2026-08-14', previousDate: '2026-08-13' });

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({
    status: 409,
    code: 'CYCLE_DATE_CONFLICT',
    retryable: false,
    requestId: 'request-cycle_409',
  });
});
