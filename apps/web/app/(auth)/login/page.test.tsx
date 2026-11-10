import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authApiMock = vi.hoisted(() => ({
  loginWeb: vi.fn(),
  registerWeb: vi.fn(),
  logoutWeb: vi.fn(),
  getCurrentUser: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-api', () => authApiMock);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => null }));

import { ApiError, getAccessToken, setAccessToken } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import type { Usuario } from '@/lib/types';
import PaginaIngreso from './page';

const usuario: Usuario = {
  id: 'login-preferences-user', email: 'eva@example.test', name: 'Eva',
  biologicalSex: 'PREFER_NOT_SAY', birthDate: null, goals: [], trackCycle: false,
  avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01T00:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'anonymous' });
  authApiMock.logoutWeb.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PaginaIngreso', () => {
  it('keeps the login form available when the browser denies preference storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });

    expect(() => render(<PaginaIngreso />)).not.toThrow();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('');
    expect(screen.getByLabelText('Recordar usuario en este dispositivo')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it.each([
    { method: 'setItem' as const, remember: true, errorName: 'QuotaExceededError' },
    { method: 'removeItem' as const, remember: false, errorName: 'SecurityError' },
  ])('completes authenticated navigation when preference $method fails', async ({ method, remember, errorName }) => {
    authApiMock.loginWeb.mockResolvedValueOnce({ accessToken: 'fresh-login-token' });
    authApiMock.getCurrentUser.mockResolvedValueOnce(usuario);
    render(<PaginaIngreso />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: usuario.email } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'synthetic-password' } });
    if (remember) fireEvent.click(screen.getByLabelText('Recordar usuario en este dispositivo'));
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException('Preference unavailable', errorName);
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Ingresar' }).closest('form')!);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(useAutenticacion.getState()).toMatchObject({ usuario, estado: 'authenticated', error: null });
    expect(getAccessToken()).toBe('fresh-login-token');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([true, false])('preserves the optional email preference without persisting credentials (remember=%s)', async (remember) => {
    localStorage.setItem('evry_email_recordado', 'previous@example.test');
    authApiMock.loginWeb.mockResolvedValueOnce({ accessToken: 'fresh-login-token' });
    authApiMock.getCurrentUser.mockResolvedValueOnce(usuario);
    render(<PaginaIngreso />);
    expect(screen.getByLabelText('Recordar usuario en este dispositivo')).toBeChecked();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: usuario.email } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'synthetic-password' } });
    if (!remember) fireEvent.click(screen.getByLabelText('Recordar usuario en este dispositivo'));

    fireEvent.submit(screen.getByRole('button', { name: 'Ingresar' }).closest('form')!);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(localStorage.getItem('evry_email_recordado')).toBe(remember ? usuario.email : null);
    expect(localStorage.length).toBe(remember ? 1 : 0);
    expect(getAccessToken()).toBe('fresh-login-token');
  });

  it('distinguishes the registration link without relying on color', () => {
    render(<PaginaIngreso />);

    expect(screen.getByRole('link', { name: 'Crear una' })).toHaveClass('underline');
  });

  it('links API field errors to inputs and blocks a duplicate pending login', async () => {
    const pending = deferred<never>();
    authApiMock.loginWeb.mockReturnValueOnce(pending.promise);
    render(<PaginaIngreso />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: '  EVA@EXAMPLE.TEST  ' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
    fireEvent.click(screen.getByLabelText('Recordar usuario en este dispositivo'));
    const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    await waitFor(() => expect(screen.getByRole('button', { name: '…' })).toBeDisabled());
    fireEvent.submit(form!);
    expect(authApiMock.loginWeb).toHaveBeenCalledOnce();
    expect(authApiMock.loginWeb).toHaveBeenCalledWith({ email: 'eva@example.test', password: 'secreto' });

    pending.reject(new ApiError({
      status: 422,
      code: 'validation_error',
      message: 'Revisa los datos.',
      retryable: false,
      fieldErrors: {
        email: ['Correo inválido.'],
        password: ['Contraseña inválida.'],
      },
    }));

    const emailError = await screen.findByText('Correo inválido.');
    const passwordError = await screen.findByText('Contraseña inválida.');
    expect(screen.getByRole('textbox', { name: /Correo electrónico/ }).closest('label')).toContainElement(emailError);
    expect(screen.getByLabelText(/Contraseña/).closest('label')).toContainElement(passwordError);
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('evry_email_recordado')).toBeNull();
  });

  it('does not navigate when logout supersedes a pending login', async () => {
    const pending = deferred<{ accessToken: string }>();
    authApiMock.loginWeb.mockReturnValueOnce(pending.promise);
    render(<PaginaIngreso />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'eva@example.test' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Ingresar' }).closest('form')!);
    await waitFor(() => expect(authApiMock.loginWeb).toHaveBeenCalledOnce());

    await useAutenticacion.getState().cerrarSesion();
    await act(async () => {
      pending.resolve({ accessToken: 'stale' });
      await pending.promise;
      await Promise.resolve();
    });

    expect(push).not.toHaveBeenCalled();
    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
  });
});
