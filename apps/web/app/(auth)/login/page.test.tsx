import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ingresar = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-store', () => ({ useAutenticacion: () => ({ ingresar, cargando: false, error: null }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/components/ui/Button', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => {
    const buttonProps = { ...props };
    delete buttonProps.loading;
    return <button {...buttonProps} />;
  },
}));
vi.mock('@/components/ui/Input', () => ({ Input: ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => <label>{label}<input {...props} /></label> }));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
import PaginaIngreso from './page';

beforeEach(() => { ingresar.mockReset(); push.mockReset(); localStorage.clear(); });
afterEach(cleanup);

describe('PaginaIngreso', () => {
  it('distinguishes the registration link without relying on color', () => {
    render(<PaginaIngreso />);

    expect(screen.getByRole('link', { name: 'Crear una' })).toHaveClass('underline');
  });

  it('shows a rejected login without navigating or persisting the email', async () => {
    ingresar.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    render(<PaginaIngreso />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'eva@example.test' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
    fireEvent.click(screen.getByLabelText('Recordar usuario en este dispositivo'));
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('evry_email_recordado')).toBeNull();
  });
});
