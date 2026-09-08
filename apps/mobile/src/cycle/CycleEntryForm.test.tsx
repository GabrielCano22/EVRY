import { fireEvent, render } from '@testing-library/react-native';
import type { components } from '@evry/api-client';
import { CycleEntryForm } from './CycleEntryForm';

// The first native-control render can take over five seconds on a cold Windows worker.
jest.setTimeout(15_000);

const entry: components['schemas']['CycleEntry'] = {
  id: 'entry', userId: 'owner', date: '2026-01-01T00:00:00.000Z', flow: 'LIGHT',
  symptoms: ['Dolor'], energy: 3, mood: 4, notes: 'Nota anterior', isPeriodStart: true,
};

it('edits a civil date without shifting it in Bogota or discarding existing fields', async () => {
  const saved: components['schemas']['CycleEntryInput'][] = [];
  const screen = await render(<CycleEntryForm entry={entry} today="2026-01-04" busy={false} onCancel={() => {}} onSave={(value) => { saved.push(value); }} />);
  expect(screen.getByDisplayValue('2026-01-01')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Fecha del registro'), '2026-01-02');
  await fireEvent.changeText(screen.getByLabelText('Notas'), 'Nota editada');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar registro' }));
  expect(saved).toEqual([{
    date: '2026-01-02', previousDate: '2026-01-01', flow: 'LIGHT', symptoms: ['Dolor'],
    energy: 3, mood: 4, notes: 'Nota editada', isPeriodStart: true,
  }]);
});

it('rejects impossible and future dates without submitting', async () => {
  const saved: unknown[] = [];
  const screen = await render(<CycleEntryForm today="2026-01-04" busy={false} onCancel={() => {}} onSave={(value) => { saved.push(value); }} />);
  for (const date of ['2026-02-30', '2026-01-05']) {
    await fireEvent.changeText(screen.getByLabelText('Fecha del registro'), date);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  }
  expect(saved).toEqual([]);
});
