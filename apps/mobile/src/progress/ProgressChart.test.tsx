import { render, screen } from '@testing-library/react-native';
import { ProgressChart, type ProgressChartPoint } from './ProgressChart';

const point = (overrides: Partial<ProgressChartPoint> = {}): ProgressChartPoint => ({
  from: '2026-11-01',
  to: '2026-11-08',
  volumeKg: 1200,
  maxWeightKg: 80,
  estimated1RMKg: 90,
  ...overrides,
});

it('renders nothing with fewer than two periods with data', async () => {
  const { rerender } = await render(<ProgressChart points={[]} />);
  expect(screen.queryByTestId('progress-chart')).toBeNull();
  await rerender(<ProgressChart points={[point()]} />);
  expect(screen.queryByTestId('progress-chart')).toBeNull();
});

it('ignores periods without a usable value', async () => {
  await render(<ProgressChart points={[
    point({ estimated1RMKg: null, maxWeightKg: null }),
    point({ estimated1RMKg: 0, maxWeightKg: 0 }),
    point(),
  ]} />);
  expect(screen.queryByTestId('progress-chart')).toBeNull();
});

it('draws the evolution and describes it for screen readers', async () => {
  await render(<ProgressChart points={[
    point({ from: '2026-10-01', to: '2026-10-08', estimated1RMKg: 80, maxWeightKg: 70 }),
    point({ from: '2026-10-08', to: '2026-10-15', estimated1RMKg: 85, maxWeightKg: 75 }),
    point({ from: '2026-10-15', to: '2026-10-22', estimated1RMKg: 90, maxWeightKg: 80 }),
  ]} />);
  expect(screen.getByTestId('progress-chart').props.accessibilityLabel)
    .toBe('Gráfica de evolución (1RM estimado): de 80.0 a 90.0 kg en 3 periodos.');
  expect(screen.getByText('1RM estimado por periodo · 3 puntos con datos')).toBeTruthy();
});

it('falls back to max weight and says so when no 1RM is available', async () => {
  await render(<ProgressChart points={[
    point({ estimated1RMKg: null, maxWeightKg: 70 }),
    point({ estimated1RMKg: null, maxWeightKg: 75 }),
  ]} />);
  expect(screen.getByTestId('progress-chart').props.accessibilityLabel)
    .toBe('Gráfica de evolución (peso máximo): de 70.0 a 75.0 kg en 2 periodos.');
  expect(screen.getByText('peso máximo por periodo · 2 puntos con datos')).toBeTruthy();
});
