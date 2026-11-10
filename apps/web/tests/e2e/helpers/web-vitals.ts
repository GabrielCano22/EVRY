export function evaluateWebVitals(values: Partial<Record<'LCP' | 'INP' | 'CLS', number>>) {
  const budgets = { LCP: 2500, INP: 200, CLS: 0.1 };
  for (const name of ['LCP', 'INP', 'CLS'] as const) {
    const value = values[name];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Missing or invalid ${name} measurement`);
    }
  }
  return {
    values: { LCP: values.LCP!, INP: values.INP!, CLS: values.CLS! },
    budgets,
    withinBudget: values.LCP! < budgets.LCP && values.INP! < budgets.INP && values.CLS! < budgets.CLS,
  };
}
