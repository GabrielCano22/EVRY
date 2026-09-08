import { fireEvent, render } from '@testing-library/react-native';
import type { RegisterInput } from '../api/client';
import { RegistrationForm } from './RegistrationForm';

// Allow native controls to load on a cold worker without dropping any assertions.
jest.setTimeout(15_000);

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
