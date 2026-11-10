import { expect, it } from 'vitest';
import { assertLocalPerformanceDatabase } from './e2e/helpers/performance-database';

const safe = 'postgresql://fixture@127.0.0.1:55438/evry_test';
it('allows explicit local synthetic database different from runtime', () => {
  expect(assertLocalPerformanceDatabase(safe, 'postgresql://blocked@127.0.0.1:1/evry_runtime')).toBe(safe);
});
it.each([
  undefined,
  'https://127.0.0.1/evry_test',
  'postgresql://fixture@db.example.com/evry_test',
  'postgresql://fixture@127.0.0.1/evry',
  `${safe}?host=db.example.com`,
  `${safe}?schema=private`,
])('rejects unsafe performance fixture URL %s before service startup', (testUrl) => {
  expect(() => assertLocalPerformanceDatabase(testUrl, undefined)).toThrow();
});
it.each(['127.0.0.1', 'localhost', '[::1]', 'LOCALHOST', 'localhost.'])('rejects runtime identity through loopback alias %s', (host) => {
  expect(() => assertLocalPerformanceDatabase(safe, `postgres://other@${host}:55438/evry_test`)).toThrow(/different/);
});
