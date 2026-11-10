import { expect, it, vi } from 'vitest';

it('formats distinct validated civil days with one caller-owned native formatter', async () => {
  vi.resetModules();
  const NativeFormatter = Intl.DateTimeFormat;
  let allocations = 0;
  Intl.DateTimeFormat = new Proxy(NativeFormatter, {
    construct(target, args) {
      allocations += 1;
      return Reflect.construct(target, args);
    },
  });
  try {
    const { civilDate, createCivilDateFormatter } = await import('./civil-date');
    const format = createCivilDateFormatter({ day: '2-digit', month: 'long', year: 'numeric' });
    expect(format(civilDate('2024-02-29'))).toBe('29 de febrero de 2024');
    expect(format(civilDate('2026-09-01'))).toBe('01 de septiembre de 2026');
    expect(format(civilDate('0001-08-01'))).toBe('01 de agosto de 1');
    expect(allocations).toBe(1);
    expect(() => format('2026-02-30' as ReturnType<typeof civilDate>)).toThrow(RangeError);
    expect(format(civilDate('2026-09-02'))).toBe('02 de septiembre de 2026');
    expect(allocations).toBe(1);
  } finally {
    Intl.DateTimeFormat = NativeFormatter;
    vi.resetModules();
  }
});

it('reuses a bounded native formatter without retaining a previous civil day', async () => {
  vi.resetModules();
  const NativeFormatter = Intl.DateTimeFormat;
  let allocations = 0;
  // Count real native allocations; every conversion still uses the real ICU
  // formatter, timezone database and independently checked date fixtures.
  Intl.DateTimeFormat = new Proxy(NativeFormatter, {
    construct(target, args) {
      allocations += 1;
      return Reflect.construct(target, args);
    },
  });
  try {
    const { todayCivil, timestampToLocalCivil } = await import('./civil-date');
    expect(allocations).toBe(0);
    for (let repeat = 0; repeat < 10; repeat += 1) {
      expect(todayCivil(new Date('2026-10-10T04:59:59.000Z'))).toBe('2026-10-09');
      expect(todayCivil(new Date('2026-10-10T05:00:00.000Z'))).toBe('2026-10-10');
      expect(timestampToLocalCivil('2024-03-01T04:59:59.000Z')).toBe('2024-02-29');
      expect(timestampToLocalCivil('2027-01-01T05:00:00.000Z')).toBe('2027-01-01');
    }
    expect(allocations).toBe(1);
    expect(() => timestampToLocalCivil('invalid')).toThrow(RangeError);
    expect(() => todayCivil(new Date(NaN))).toThrow(RangeError);
    expect(allocations).toBe(1);
  } finally {
    Intl.DateTimeFormat = NativeFormatter;
    vi.resetModules();
  }
});
