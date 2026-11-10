import { describe, expect, it } from 'vitest';
import { evaluateWebVitals } from './e2e/helpers/web-vitals';

describe('lab Web Vitals budget evaluation', () => {
  it('accepts complete measurements below all three budgets', () => {
    expect(evaluateWebVitals({ LCP: 2499, INP: 199, CLS: 0.099 }).withinBudget).toBe(true);
  });

  it.each([
    { LCP: 2500, INP: 100, CLS: 0 },
    { LCP: 1000, INP: 200, CLS: 0 },
    { LCP: 1000, INP: 100, CLS: 0.1 },
  ])('rejects a measurement at the strict budget boundary: %j', (values) => {
    expect(evaluateWebVitals(values).withinBudget).toBe(false);
  });

  it('does not turn an unreported interaction metric into zero', () => {
    expect(() => evaluateWebVitals({ LCP: 1000, CLS: 0 })).toThrow(/INP/);
  });

  it.each([NaN, Infinity, -1])('rejects invalid numeric measurements: %s', (INP) => {
    expect(() => evaluateWebVitals({ LCP: 1000, INP, CLS: 0 })).toThrow(/INP/);
  });
});
