import { expect, it, vi } from 'vitest';

it('does not allocate native date formatters when importing the unmounted calendar', async () => {
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
    await import('../components/CalendarioActividad');
    expect(allocations).toBe(0);
  } finally {
    Intl.DateTimeFormat = NativeFormatter;
    vi.resetModules();
  }
});
