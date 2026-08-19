import { describe, expect, it } from 'vitest';
import {
  civilDate,
  compareCivil,
  formatCivilDate,
  monthRange,
  parseCivilDate,
  periodRange,
  timestampToLocalCivil,
  todayCivil,
} from './civil-date';

describe('civil dates in America/Bogota', () => {
  it('keeps the civil day at the 18:59/19:01 UTC boundary in Bogota', () => {
    expect(todayCivil(new Date('2026-08-01T23:59:00.000Z'))).toBe('2026-08-01');
    expect(todayCivil(new Date('2026-08-02T00:01:00.000Z'))).toBe('2026-08-01');
  });

  it('converts real timestamps to their Bogota civil day', () => {
    expect(timestampToLocalCivil('2026-08-02T00:01:00.000Z')).toBe('2026-08-01');
  });

  it('accepts leap-day components and rejects impossible civil calendar dates', () => {
    const leapDay = civilDate('2024-02-29');

    expect(parseCivilDate(leapDay)).toEqual({ year: 2024, month: 2, day: 29 });
    expect(() => civilDate('2025-02-29')).toThrow(RangeError);
    expect(() => civilDate('2026-2-01')).toThrow(RangeError);
    expect(() => parseCivilDate('2025-02-29' as ReturnType<typeof civilDate>)).toThrow(RangeError);
  });

  it('formats a civil date without shifting 2026-08-01 to 31 July', () => {
    expect(
      formatCivilDate(civilDate('2026-08-01'), {
        day: 'numeric',
        month: 'long',
      }),
    ).toBe('1 de agosto');
  });

  it('preserves civil year 0001 through parsing, formatting, and day ranges', () => {
    const firstCenturyDate = civilDate('0001-08-01');
    const now = new Date('0001-08-01T17:00:00.000Z');

    expect(parseCivilDate(firstCenturyDate)).toEqual({ year: 1, month: 8, day: 1 });
    expect(periodRange('30d', now)).toEqual({ from: '0001-07-03', to: '0001-08-01' });
    expect(
      formatCivilDate(firstCenturyDate, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    ).toBe('01/08/1');
  });

  it('rejects year 0000 because the civil-date domain is 0001 through 9999', () => {
    expect(() => civilDate('0000-01-01')).toThrow(RangeError);
  });

  it('returns inclusive month endpoints across a leap February and year boundary', () => {
    expect(monthRange(2024, 2)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthRange(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('uses inclusive calendar-day boundaries for 30 and 90 day periods', () => {
    const now = new Date('2026-01-01T00:01:00.000Z');

    expect(periodRange('30d', now)).toEqual({ from: '2025-12-02', to: '2025-12-31' });
    expect(periodRange('90d', now)).toEqual({ from: '2025-10-03', to: '2025-12-31' });
  });

  it('uses inclusive calendar-month boundaries for six months and one year', () => {
    const now = new Date('2026-08-19T17:00:00.000Z');

    expect(periodRange('6m', now)).toEqual({ from: '2026-02-19', to: '2026-08-19' });
    expect(periodRange('1y', now)).toEqual({ from: '2025-08-19', to: '2026-08-19' });
  });

  it('caps month subtraction at February end for leap and non-leap calendar years', () => {
    expect(periodRange('6m', new Date('2024-08-31T17:00:00.000Z'))).toEqual({
      from: '2024-02-29',
      to: '2024-08-31',
    });
    expect(periodRange('1y', new Date('2024-02-29T17:00:00.000Z'))).toEqual({
      from: '2023-02-28',
      to: '2024-02-29',
    });
  });

  it('compares validated civil dates by calendar order', () => {
    expect(compareCivil(civilDate('2026-01-01'), civilDate('2025-12-31'))).toBeGreaterThan(0);
    expect(compareCivil(civilDate('2026-01-01'), civilDate('2026-01-01'))).toBe(0);
  });
});
