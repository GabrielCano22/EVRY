export type CivilDate = string & { readonly __civilDate: unique symbol };
export type PeriodKey = '30d' | '90d' | '6m' | '1y' | 'all';

const BOGOTA_TIME_ZONE = 'America/Bogota';
const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type CivilDateParts = { year: number; month: number; day: number };

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function civilDateFromParts({ year, month, day }: CivilDateParts): CivilDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RangeError('La fecha civil no es válida.');
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError('La fecha civil no es válida.');
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as CivilDate;
}

function partsFromFormatter(formatter: Intl.DateTimeFormat, value: Date): CivilDateParts {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function localPresentationDate(value: CivilDate): Date {
  const { year, month, day } = parseCivilDate(value);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

function addCalendarDays(value: CivilDate, days: number): CivilDate {
  const date = localPresentationDate(value);
  date.setDate(date.getDate() + days);
  return civilDateFromParts({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

function subtractCalendarMonths(value: CivilDate, months: number): CivilDate {
  const { year, month, day } = parseCivilDate(value);
  const monthIndex = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  return civilDateFromParts({
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, daysInMonth(targetYear, targetMonth)),
  });
}

export function civilDate(value: string): CivilDate {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) throw new RangeError('La fecha civil debe usar el formato AAAA-MM-DD.');
  return civilDateFromParts({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
}

export function todayCivil(now: Date = new Date()): CivilDate {
  return civilDateFromParts(
    partsFromFormatter(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: BOGOTA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      now,
    ),
  );
}

export function parseCivilDate(value: CivilDate): CivilDateParts {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) throw new RangeError('La fecha civil debe usar el formato AAAA-MM-DD.');
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  civilDateFromParts(parts);
  return parts;
}

export function formatCivilDate(value: CivilDate, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es-CO', options).format(localPresentationDate(value));
}

export function timestampToLocalCivil(iso: string): CivilDate {
  const timestamp = new Date(iso);
  if (Number.isNaN(timestamp.getTime())) throw new RangeError('El timestamp no es válido.');
  return civilDateFromParts(
    partsFromFormatter(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: BOGOTA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      timestamp,
    ),
  );
}

export function monthRange(year: number, month: number): { from: CivilDate; to: CivilDate } {
  return {
    from: civilDateFromParts({ year, month, day: 1 }),
    to: civilDateFromParts({ year, month, day: daysInMonth(year, month) }),
  };
}

export function periodRange(
  period: Exclude<PeriodKey, 'all'>,
  now: Date = new Date(),
): { from: CivilDate; to: CivilDate } {
  const to = todayCivil(now);
  switch (period) {
    case '30d':
      return { from: addCalendarDays(to, -29), to };
    case '90d':
      return { from: addCalendarDays(to, -89), to };
    case '6m':
      return { from: subtractCalendarMonths(to, 6), to };
    case '1y':
      return { from: subtractCalendarMonths(to, 12), to };
  }
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
