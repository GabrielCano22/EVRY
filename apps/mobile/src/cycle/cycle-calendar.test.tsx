import { fireEvent, render, screen } from '@testing-library/react-native';
import { civilDate } from '@evry/domain';
import { calendarMonth, CycleCalendar } from './cycle-calendar';

const today = civilDate('2026-11-08');

it('builds a Monday-first leap-year calendar without changing civil dates', () => {
  const days = calendarMonth(2024, 1);
  expect(days.slice(0, 5)).toEqual([null, null, null, '2024-02-01', '2024-02-02']);
  expect(days).toContain('2024-02-29');
  expect(days).not.toContain('2024-02-30');
  expect(days.length % 7).toBe(0);
  expect(calendarMonth(2024, -1)).toContain('2023-12-31');
});

it('distinguishes training, cycle, today and future days and opens the tapped day', async () => {
  const onSelectDay = jest.fn();
  await render(<CycleCalendar
    activityDates={['2026-11-03', '2026-11-08']}
    entries={[{ date: '2026-11-08T00:00:00.000Z' }]}
    onSelectDay={onSelectDay}
    selectedDate="2026-11-03"
    streakDays={3}
    restDays={4}
    today={today}
  />);

  expect(screen.getByLabelText('3 de noviembre, entrenamiento')).toBeTruthy();
  expect(screen.getByLabelText('8 de noviembre, entrenamiento, registro de ciclo, hoy')).toBeTruthy();
  expect(screen.getByLabelText('20 de noviembre, fecha futura')).toBeTruthy();
  expect(screen.getByText('Calendario de entrenamientos y ciclo')).toBeTruthy();
  expect(screen.getByText('Racha de 3 días · 4 días de descanso este mes')).toBeTruthy();
  expect(screen.getByText(/No representa una predicción/)).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('3 de noviembre, entrenamiento'));
  expect(onSelectDay).toHaveBeenCalledWith('2026-11-03');
  await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  expect(screen.getByText('octubre de 2026')).toBeTruthy();
});

it('hides every cycle mark while the layer is off and can turn it back on', async () => {
  const onToggleCycleLayer = jest.fn();
  await render(<CycleCalendar
    entries={[{ date: '2026-11-08T00:00:00.000Z' }]}
    onToggleCycleLayer={onToggleCycleLayer}
    showCycle={false}
    today={today}
  />);

  expect(screen.queryByLabelText(/registro de ciclo/)).toBeNull();
  expect(screen.getByText('Calendario de entrenamientos')).toBeTruthy();
  expect(screen.getByText('Mostrar ciclo')).toBeTruthy();
  await fireEvent(screen.getByLabelText('Ocultar capa de ciclo'), 'valueChange', true);
  expect(onToggleCycleLayer).toHaveBeenCalledWith(true);
});

it('offers to enable tracking when the account does not follow the cycle', async () => {
  const onActivateTracking = jest.fn();
  await render(<CycleCalendar entries={[]} onActivateTracking={onActivateTracking} today={today} tracking={false} />);

  expect(screen.queryByText('Ciclo')).toBeNull();
  expect(screen.queryByLabelText('Ocultar capa de ciclo')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Activar seguimiento del ciclo' }));
  expect(onActivateTracking).toHaveBeenCalled();
});
