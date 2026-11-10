import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { DEFAULT_API_BASE_URL } from '@/lib/api-origin';
import { setAccessToken } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import { account } from '@/tests/fixtures/exercise-detail';
import PaginaRegistro from './page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const registrationUrl = `${DEFAULT_API_BASE_URL}/auth/register`;
let submissions: unknown[] = [];
const server = setupServer(http.post(registrationUrl, async ({ request }) => {
  submissions.push(await request.json());
  return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Revisa los datos enviados.',
    fieldErrors: { password: ['El servidor rechazó la contraseña.'] }, retryable: false,
    requestId: 'registration-boundary-fixture' }, { status: 400 });
}));

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  submissions = [];
  push.mockClear();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'anonymous' });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'anonymous' });
});
afterAll(() => server.close());

function completeForm(password: string) {
  render(<PaginaRegistro />);
  fireEvent.click(screen.getByRole('button', { name: 'Prefiero no decir' }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Eva' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'eva@example.test' } });
  const input = screen.getByLabelText('Contraseña (mín. 8 caracteres)');
  fireEvent.change(input, { target: { value: password } });
  fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!);
  return input;
}

it('describes the byte limit before the user submits a password', () => {
  render(<PaginaRegistro />);
  const input = screen.getByLabelText('Contraseña (mín. 8 caracteres)');
  expect(input).toHaveAccessibleDescription(/72 bytes UTF-8/);
  expect(input).not.toHaveAttribute('aria-invalid', 'true');
  expect(submissions).toHaveLength(0);
});

it('associates a server password error with the field without losing the entered secret', async () => {
  const input = completeForm('valid-password');
  await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
  expect(input).toHaveAccessibleDescription(/El servidor rechazó la contraseña/);
  expect(input).toHaveValue('valid-password');
  expect(submissions).toEqual([{ email: 'eva@example.test', password: 'valid-password',
    name: 'Eva', biologicalSex: 'PREFER_NOT_SAY', trackCycle: false }]);
  expect(useAutenticacion.getState().usuario).toBeNull();
  expect(push).not.toHaveBeenCalled();
});

it.each([
  ['ASCII over capacity', 'a'.repeat(73)],
  ['two-byte Unicode over capacity', 'é'.repeat(37)],
  ['four-byte Unicode over capacity', '🙂'.repeat(19)],
  ['malformed Unicode', 'valid-pass\ud800'],
  ['fewer than eight Unicode characters', '🙂'.repeat(7)],
])('explains an unusable password locally without registering: %s', async (_label, password) => {
  const input = completeForm(password);
  await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
  expect(input).toHaveAccessibleDescription();
  expect(input).toHaveValue(password);
  expect(submissions).toHaveLength(0);
  expect(useAutenticacion.getState().estado).toBe('anonymous');
  expect(push).not.toHaveBeenCalled();
});

it.each(['a'.repeat(72), 'é'.repeat(36), '🙂'.repeat(18), 'a'.repeat(71) + ' '])(
  'registers with the complete valid 72-byte password: %s', async password => {
    server.use(http.post(registrationUrl, async ({ request }) => {
      submissions.push(await request.json());
      return HttpResponse.json({ accessToken: 'registration-fixture-token' }, { status: 201 });
    }), http.get(`${DEFAULT_API_BASE_URL}/users/me`, () => HttpResponse.json(account)));
    completeForm(password);
    await waitFor(() => expect(useAutenticacion.getState().estado).toBe('authenticated'));
    expect(submissions).toEqual([{ email: 'eva@example.test', password, name: 'Eva',
      biologicalSex: 'PREFER_NOT_SAY', trackCycle: false }]);
    expect(push).toHaveBeenCalledWith('/dashboard');
  },
);
