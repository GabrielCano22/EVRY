import { buildOverviewCards, signedMetric } from './progress-view';

describe('mobile progress presentation', () => {
  it('builds useful metric cards from the typed overview', () => {
    expect(buildOverviewCards({
      sessionsCompleted: 4,
      volumeKg: 1250.5,
      activeDays: 3,
      weeklyFrequency: 0.93,
    })).toEqual([
      { label: 'Sesiones', value: '4' },
      { label: 'Volumen', value: '1.250,5 kg' },
      { label: 'Días activos', value: '3' },
      { label: 'Frecuencia', value: '0,93/sem' },
    ]);
  });

  it('makes comparison direction explicit', () => {
    expect(signedMetric(2)).toBe('+2');
    expect(signedMetric(-1.25)).toBe('-1,25');
    expect(signedMetric(0)).toBe('0');
  });
});
