import { fireEvent, render, screen } from '@testing-library/react-native';
import { calendarMonth, CycleCalendar } from './cycle-calendar';

it('builds a Monday-first leap-year calendar without changing civil dates', () => {
  const days = calendarMonth(2024, 1);
  expect(days.slice(0, 5)).toEqual([null, null, null, '2024-02-01', '2024-02-02']);
  expect(days).toContain('2024-02-29');
  expect(days).not.toContain('2024-02-30');
  expect(days.length % 7).toBe(0);
  expect(calendarMonth(2024, -1)).toContain('2023-12-31');
});

it('marks only provided records and allows month navigation', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 8, 12));
  try {
    await render(<CycleCalendar entries={[{ date: '2026-11-08T00:00:00.000Z' }]} />);
    expect(screen.getByLabelText('2026-11-08, registro de ciclo')).toBeTruthy();
    expect(screen.getByText('Calendario de registros de ciclo')).toBeTruthy();
    expect(screen.queryByText(/entrenamiento sincronizado/)).toBeNull();
    expect(screen.getByText(/No representa una predicción/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByLabelText('2026-10-08')).toBeTruthy();
  } finally { jest.useRealTimers(); }
});
