import { fireEvent, render } from '@testing-library/react-native';
import type { RegisterInput } from '../api/client';
import { RegistrationForm } from './RegistrationForm';

// Allow native controls to load on a cold worker without dropping any assertions.
jest.setTimeout(15_000);

it.each([
  ['ASCII over capacity', 'a'.repeat(73)],
  ['two-byte Unicode over capacity', 'é'.repeat(37)],
  ['four-byte Unicode over capacity', '🙂'.repeat(19)],
  ['malformed Unicode', 'valid-pass\ud800'],
  ['fewer than eight Unicode characters', '🙂'.repeat(7)],
])('rejects an unusable registration password before submission: %s', async (_label, password) => {
  const submissions: RegisterInput[] = [];
  const screen = await render(<RegistrationForm busy={false} error={null} onSubmit={input => { submissions.push(input); }} />);
  await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Native');
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'native@example.test');
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(submissions).toHaveLength(0);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Contraseña').props.value).toBe(password);
});

it.each(['a'.repeat(72), 'é'.repeat(36), '🙂'.repeat(18), 'a'.repeat(71) + ' '])(
  'submits the whole valid 72-byte password without trimming or normalization: %s', async password => {
    const submissions: RegisterInput[] = [];
    const screen = await render(<RegistrationForm busy={false} error={null} onSubmit={input => { submissions.push(input); }} />);
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Native');
    await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'native@example.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), password);
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(submissions).toEqual([{ name: 'Native', email: 'native@example.test', password, trackCycle: false }]);
    expect(screen.queryByRole('alert')).toBeNull();
  },
);

it('validates fields before submitting and makes cycle tracking an explicit choice', async () => {
  const submissions: RegisterInput[] = [];
  const screen = await render(<RegistrationForm busy={false} error={null} onSubmit={(input) => { submissions.push(input); }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(submissions).toHaveLength(0);
  expect(screen.getByText('Escribe un nombre de al menos 2 caracteres.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Nombre'), ' Native ');
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), ' Native@Example.com ');
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'valid-password');
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'different-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(submissions).toHaveLength(0);
  expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'valid-password');
  expect(screen.getByLabelText('Activar seguimiento de ciclo').props.value).toBe(false);
  await fireEvent(screen.getByLabelText('Activar seguimiento de ciclo'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(submissions).toEqual([{ name: 'Native', email: 'native@example.com', password: 'valid-password', trackCycle: true }]);
});

it('preserves entered fields after a server error and prevents another submission while busy', async () => {
  const submissions: RegisterInput[] = [];
  const onSubmit = (input: RegisterInput) => { submissions.push(input); };
  const screen = await render(<RegistrationForm busy={false} error={null} onSubmit={onSubmit} />);
  await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Native');
  await screen.rerender(<RegistrationForm busy error={null} onSubmit={onSubmit} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Creando cuenta…' }));
  expect(submissions).toHaveLength(0);
  await screen.rerender(<RegistrationForm busy={false} error="El correo ya está registrado." onSubmit={onSubmit} />);
  expect(screen.getByDisplayValue('Native')).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent('El correo ya está registrado.');
});
