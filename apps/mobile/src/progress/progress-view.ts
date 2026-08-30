import type { components } from '@evry/api-client';

type OverviewMetrics = components['schemas']['OverviewMetrics'];

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export function signedMetric(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${numberFormatter.format(value)}`;
}

export function buildOverviewCards(metrics: OverviewMetrics): { label: string; value: string }[] {
  return [
    { label: 'Sesiones', value: String(metrics.sessionsCompleted) },
    { label: 'Volumen', value: `${numberFormatter.format(metrics.volumeKg)} kg` },
    { label: 'Días activos', value: String(metrics.activeDays) },
    { label: 'Frecuencia', value: `${numberFormatter.format(metrics.weeklyFrequency)}/sem` },
  ];
}
