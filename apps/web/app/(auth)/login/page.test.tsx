import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import { ApiError, setAccessToken } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import PaginaIngreso from './page';

function rejectedDeferred<T>() {
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((_resolve, fail) => { reject = fail; });
  return { promise, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'anonymous' });
});
afterEach(cleanup);

describe('PaginaIngreso', () => {
  it('distinguishes the registration link without relying on color', () => {
    render(<PaginaIngreso />);

    expect(screen.getByRole('link', { name: 'Crear una' })).toHaveClass('underline');
  });

  it('links API field errors to inputs and blocks a duplicate pending login', async () => {
    const pending = rejectedDeferred<never>();
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
});
