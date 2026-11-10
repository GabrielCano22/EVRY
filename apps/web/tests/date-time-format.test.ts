import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

it('formats a history page without rebuilding the native formatter for every row', async () => {
  vi.resetModules();
  // Keep native ICU formatting real; observe only its expensive construction.
  const NativeDateTimeFormat = Intl.DateTimeFormat;
  const constructions = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
    return new NativeDateTimeFormat(locales, options);
  });
  const { formatearFechaHora, formatDateTime } = await import('../lib/utils');
  const dates = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 8, i + 1, 15, 30)));
  const rendered = dates.map((date, index) => index % 2
    ? formatDateTime(date.toISOString()) : formatearFechaHora(date));
  expect(rendered).toHaveLength(30);
  expect(rendered[0]).toBe('1 de sept, 10:30 a. m.');
  expect(rendered[29]).toBe('30 de sept, 10:30 a. m.');
  expect(new Set(rendered).size).toBe(30);
  expect(constructions).toHaveBeenCalledTimes(1);
});

it('preserves Bogotá midnight boundaries and rejects invalid instants after reuse', async () => {
  vi.resetModules();
  const { formatearFechaHora } = await import('../lib/utils');
  expect(formatearFechaHora('2026-09-02T04:59:00Z')).toBe('1 de sept, 11:59 p. m.');
  expect(formatearFechaHora(new Date('2026-09-02T05:01:00Z'))).toBe('2 de sept, 12:01 a. m.');
  expect(() => formatearFechaHora('not-a-date')).toThrow(RangeError);
  expect(formatearFechaHora('2026-09-02T04:59:00Z')).toBe('1 de sept, 11:59 p. m.');
});
